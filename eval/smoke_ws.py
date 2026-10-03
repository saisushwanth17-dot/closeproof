"""
WebSocket smoke test for CloseProof live telemetry stream.
Connects to /ws/telemetry during a run, collects envelopes, verifies >=10 received,
and verifies GET /api/runs/{run_id}/packet.md totals match GET /api/runs/{run_id} totals.
"""
import asyncio
import json
import urllib.request
import websockets

BASE_HTTP = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/telemetry"


def trigger_run():
    req = urllib.request.Request(f"{BASE_HTTP}/api/runs", method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def get_run(run_id):
    req = urllib.request.Request(f"{BASE_HTTP}/api/runs/{run_id}", method="GET")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def get_packet(run_id):
    req = urllib.request.Request(f"{BASE_HTTP}/api/runs/{run_id}/packet.md", method="GET")
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode()


async def run_ws_smoke():
    print(f"Connecting to {WS_URL}...", flush=True)
    received_envelopes = []

    async with websockets.connect(WS_URL) as ws:
        print("Connected to WebSocket. Triggering POST /api/runs...", flush=True)
        run_data = await asyncio.to_thread(trigger_run)
        run_id = run_data["run_id"]
        print(f"Run triggered: run_id={run_id}, initial status={run_data['status']}", flush=True)

        # Stream envelopes until packet_ready or timeout
        while True:
            try:
                raw_msg = await asyncio.wait_for(ws.recv(), timeout=15.0)
                env = json.loads(raw_msg)
                received_envelopes.append(env)
                event_name = env.get("event")
                print(f"  [{len(received_envelopes)}] event={event_name} severity={env.get('severity')}", flush=True)
                if event_name == "packet_ready":
                    print("  -> packet_ready event received!", flush=True)
                    break
            except asyncio.TimeoutError:
                print("  Stream wait timed out after inactivity.", flush=True)
                break

    print(f"\nTotal envelopes received via WebSocket: {len(received_envelopes)}", flush=True)
    assert len(received_envelopes) >= 10, f"Expected >= 10 envelopes, received {len(received_envelopes)}"

    # Verification: GET packet.md totals equal GET /api/runs/{id} totals
    run_json = await asyncio.to_thread(get_run, run_id)
    items = run_json["items"]
    matched_items = [i for i in items if i["status"] == "matched"]
    exception_items = [i for i in items if i["status"] == "exception"]

    total_items = len(items)
    matched_count = len(matched_items)
    exception_count = len(exception_items)

    packet_md = await asyncio.to_thread(get_packet, run_id)

    # Assert counts and totals match exactly
    assert f"| **Total Items Processed** | {total_items:,} |" in packet_md, "Total items mismatch in packet"
    assert f"({matched_count} matched / {total_items} total)" in packet_md, "Matched count mismatch in packet"
    assert f"({exception_count} exceptions)" in packet_md, "Exception count mismatch in packet"

    print("Total items, matched count, and exception count verified: Packet totals EQUAL Run totals!", flush=True)
    print("\nALL SMOKE TEST CHECKS PASSED SUCCESSFULLY!", flush=True)
    return True


if __name__ == "__main__":
    asyncio.run(run_ws_smoke())
