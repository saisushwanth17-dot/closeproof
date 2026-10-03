import unittest
from fastapi.testclient import TestClient
from api.main import app, RUNS_DB
from fixtures.loader import build_fixture_txns


class TestAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_root_endpoint(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "CloseProof API is live. Built on Nebius & NVIDIA.")

    def test_start_reconciliation_endpoint(self):
        response = self.client.post("/api/runs")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("run_id", data)
        self.assertEqual(data["status"], "running")
        self.assertIn("items", data)

        items = data["items"]
        self.assertEqual(len(items), 8)  # Canonical fixture produces 8 ReconItems (3 matched + 5 exceptions)

        # Check anomalies and statuses in items
        statuses = {item["status"] for item in items}
        self.assertIn("matched", statuses)
        self.assertIn("exception", statuses)

        actions = {item["human_action"] for item in items}
        self.assertIn("approve_match", actions)
        self.assertIn("write_off", actions)
        self.assertIn("request_receipt", actions)
        self.assertIn("contact_vendor", actions)

        run_id = data["run_id"]

        # Test GET /api/runs/{run_id}
        get_resp = self.client.get(f"/api/runs/{run_id}")
        self.assertEqual(get_resp.status_code, 200)
        run_data = get_resp.json()
        self.assertEqual(run_data["run_id"], run_id)
        self.assertEqual(len(run_data["items"]), 8)

        # Test GET /api/runs/{run_id}/packet.md request-time generation
        packet_resp = self.client.get(f"/api/runs/{run_id}/packet.md")
        self.assertEqual(packet_resp.status_code, 200)
        self.assertIn("text/markdown", packet_resp.headers["content-type"])
        self.assertIn("# Month-End Close Packet", packet_resp.text)
        self.assertIn("Exceptions Requiring Human Action", packet_resp.text)
        self.assertIn("Matched Transactions", packet_resp.text)

        # Verify totals match between GET /api/runs/{run_id} and packet.md
        matched_count = sum(1 for i in items if i["status"] == "matched")
        exception_count = sum(1 for i in items if i["status"] == "exception")
        total_count = len(items)
        self.assertIn(f"{matched_count} matched / {total_count} total", packet_resp.text)
        self.assertIn(f"({exception_count} exceptions)", packet_resp.text)

        # Test GET /api/runs/{run_id}/events
        events_resp = self.client.get(f"/api/runs/{run_id}/events")
        self.assertEqual(events_resp.status_code, 200)
        self.assertIsInstance(events_resp.json(), list)

    def test_record_human_action(self):
        # Create a run first
        post_resp = self.client.post("/api/runs")
        run_id = post_resp.json()["run_id"]
        items = post_resp.json()["items"]

        # Pick an exception item
        exc_item = next(i for i in items if i["status"] == "exception")
        item_id = exc_item["id"]

        # Apply action
        action_resp = self.client.post(
            f"/api/runs/{run_id}/items/{item_id}/action",
            json={"action": "write_off", "status": "approved", "note": "Auditor approved adjustment"}
        )
        self.assertEqual(action_resp.status_code, 200)
        action_data = action_resp.json()
        self.assertTrue(action_data["success"])
        self.assertEqual(action_data["action"], "write_off")
        self.assertEqual(action_data["status"], "approved")

        # Verify updated in GET /api/runs/{run_id}
        run_resp = self.client.get(f"/api/runs/{run_id}")
        updated_item = next(i for i in run_resp.json()["items"] if i["id"] == item_id)
        self.assertEqual(updated_item["human_action"], "write_off")
        self.assertEqual(updated_item["status"], "approved")

        # Verify action_applied event recorded in events
        events_resp = self.client.get(f"/api/runs/{run_id}/events")
        events = events_resp.json()
        action_events = [e for e in events if e.get("event") == "action_applied"]
        self.assertTrue(len(action_events) >= 1)
        self.assertEqual(action_events[-1]["payload"]["item_id"], item_id)
        self.assertEqual(action_events[-1]["payload"]["action"], "write_off")

    def test_404_handling(self):
        fake_id = "non-existent-run-id"
        self.assertEqual(self.client.get(f"/api/runs/{fake_id}").status_code, 404)
        self.assertEqual(self.client.get(f"/api/runs/{fake_id}/events").status_code, 404)
        self.assertEqual(self.client.get(f"/api/runs/{fake_id}/packet.md").status_code, 404)
        self.assertEqual(
            self.client.post(f"/api/runs/{fake_id}/items/item-1/action", json={"action": "write_off"}).status_code,
            404
        )


if __name__ == "__main__":
    unittest.main()
