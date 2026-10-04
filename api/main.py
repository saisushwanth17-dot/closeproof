import os
import uuid
import asyncio
import shutil
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

# Import core engine and contracts
from core.ledger import Txn
from core.reconcile import reconcile, ReconItem, Evidence
from core.packet import generate_close_packet
from core.explain import explain_exceptions
from core.enrich import enrich_exception
from core.telemetry import make_envelope, ALLOWED_EVENTS
from core.ingest import parse_bank_csv, parse_stripe_csv, parse_invoices_csv, parse_receipts
from fixtures.loader import build_fixture_txns

app = FastAPI(title="CloseProof API", version="1.0")

# Allow the frontend (Next.js) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for runs, telemetry envelopes, and execution status
RUNS_DB: Dict[str, List[ReconItem]] = {}
RUNS_EVENTS: Dict[str, List[Dict[str, Any]]] = {}
RUNS_STATUS: Dict[str, str] = {}

# Connected WebSocket telemetry clients
CLIENTS: List[WebSocket] = []


class RunResponse(BaseModel):
    run_id: str
    status: str
    items: List[ReconItem] = []


class ActionRequest(BaseModel):
    action: str
    status: Optional[str] = None
    note: Optional[str] = None


class UploadResponse(BaseModel):
    run_id: str
    warnings: List[str] = []


async def broadcast_telemetry(envelope: Dict[str, Any]):
    """
    Broadcasts a telemetry envelope to all active WebSocket subscribers.
    Dead connections are culled automatically.
    """
    dead_clients = []
    for client in list(CLIENTS):
        try:
            await asyncio.wait_for(client.send_json(envelope), timeout=1.0)
        except Exception:
            dead_clients.append(client)

    for client in dead_clients:
        if client in CLIENTS:
            CLIENTS.remove(client)


async def run_reconciliation_pipeline(run_id: str, txns: List[Txn], items: List[ReconItem]):
    """
    Async background pipeline streaming live Contract C telemetry envelopes:
    feed_ingested (per source) → recon_match / recon_exception (per item) →
    explain_done (per exception) → tavily_lookup (per enrichment) → packet_ready.
    """
    # 1. feed_ingested (per source)
    sources = []
    for t in txns:
        if t.source not in sources:
            sources.append(t.source)

    for src in sources:
        count = sum(1 for t in txns if t.source == src)
        env = make_envelope(
            event="feed_ingested",
            severity="info",
            payload={"run_id": run_id, "source": src, "count": count},
        )
        RUNS_EVENTS[run_id].append(env)
        await broadcast_telemetry(env)
        await asyncio.sleep(0.01)

    # 2. recon_match / recon_exception (per item)
    for item in items:
        if item.status == "matched":
            env = make_envelope(
                event="recon_match",
                severity="info",
                payload={
                    "run_id": run_id,
                    "id": item.id,
                    "amount": item.amount,
                    "confidence": item.confidence,
                    "explanation": item.explanation,
                    "candidates": [c.to_dict() for c in item.candidates],
                    "citations": item.citations,
                },
            )
        else:
            env = make_envelope(
                event="recon_exception",
                severity="warn",
                payload={
                    "run_id": run_id,
                    "id": item.id,
                    "amount": item.amount,
                    "confidence": item.confidence,
                    "explanation": item.explanation,
                    "human_action": item.human_action,
                    "candidates": [c.to_dict() for c in item.candidates],
                    "citations": item.citations,
                },
            )
        RUNS_EVENTS[run_id].append(env)
        await broadcast_telemetry(env)
        await asyncio.sleep(0.01)

    # 3. explain_done (per exception)
    try:
        items = await asyncio.wait_for(asyncio.to_thread(explain_exceptions, items), timeout=12.0)
    except Exception as e:
        items = explain_exceptions(items)

    for item in items:
        if item.status == "exception":
            env = make_envelope(
                event="explain_done",
                severity="info",
                payload={
                    "run_id": run_id,
                    "item_id": item.id,
                    "model_tier": "ultra",
                    "confidence": item.confidence,
                    "explanation": item.explanation or "Forensic analysis of exception completed.",
                    "recommended_action": item.human_action,
                },
            )
            RUNS_EVENTS[run_id].append(env)
            await broadcast_telemetry(env)
            await asyncio.sleep(0.01)

    # 4. tavily_lookup (per enrichment)
    enriched_items = []
    for item in items:
        if item.status == "exception":
            try:
                item = await asyncio.wait_for(asyncio.to_thread(enrich_exception, item), timeout=4.0)
            except Exception:
                item = enrich_exception(item)
        enriched_items.append(item)
    items = enriched_items

    for item in items:
        if item.status == "exception" and item.citations:
            url_cites = [c for c in item.citations if c.startswith("http://") or c.startswith("https://")]
            if url_cites:
                env = make_envelope(
                    event="tavily_lookup",
                    severity="info",
                    payload={
                        "run_id": run_id,
                        "item_id": item.id,
                        "urls": url_cites,
                    },
                )
                RUNS_EVENTS[run_id].append(env)
                await broadcast_telemetry(env)
                await asyncio.sleep(0.01)

    RUNS_DB[run_id] = items

    # 5. packet_ready
    matched_count = sum(1 for i in items if i.status == "matched")
    exception_count = sum(1 for i in items if i.status == "exception")
    total_unreconciled_cents = sum(
        round(abs(i.amount) * 100) for i in items if i.status == "exception"
    )

    env = make_envelope(
        event="packet_ready",
        severity="info",
        payload={
            "run_id": run_id,
            "status": "ready",
            "summary": {
                "matched_count": matched_count,
                "exception_count": exception_count,
                "total_unreconciled_cents": total_unreconciled_cents,
            },
            "packet_path": f"/api/runs/{run_id}/packet.md",
        },
    )
    RUNS_EVENTS[run_id].append(env)
    await broadcast_telemetry(env)

    RUNS_STATUS[run_id] = "completed"


@app.get("/")
def root():
    """Root endpoint health check."""
    return {"message": "CloseProof API is live. Built on Nebius & NVIDIA."}


@app.post("/api/runs", response_model=RunResponse)
async def start_reconciliation():
    """
    Triggers a reconciliation run over the fixture transactions for the demo.
    Returns immediately with run_id and starts an async background task to stream
    Contract C telemetry envelopes across all 5 close stages.
    """
    run_id = str(uuid.uuid4())
    txns = build_fixture_txns()

    # Deterministic initial reconciliation so ledger items are immediately available
    items = reconcile(txns)

    RUNS_STATUS[run_id] = "running"
    RUNS_EVENTS[run_id] = []
    RUNS_DB[run_id] = items

    # Start background streaming pipeline
    asyncio.create_task(run_reconciliation_pipeline(run_id, txns, items))

    return RunResponse(run_id=run_id, status="running", items=items)


@app.post("/api/runs/upload", response_model=UploadResponse)
async def upload_run(
    bank_csv: Optional[UploadFile] = File(None),
    stripe_csv: Optional[UploadFile] = File(None),
    invoices_csv: Optional[UploadFile] = File(None),
    receipts: List[UploadFile] = File([]),
):
    """
    Ingests user-uploaded financial feeds (bank CSV, Stripe CSV, Invoices CSV, Receipt images/PDFs),
    reconciles, explains, enriches, streams telemetry, and returns {run_id, warnings[]}.
    """
    run_id = str(uuid.uuid4())
    warnings: List[str] = []
    txns: List[Txn] = []

    temp_dir = tempfile.mkdtemp(prefix=f"closeproof_up_{run_id[:8]}_")

    try:
        if bank_csv and bank_csv.filename:
            b_path = Path(temp_dir) / f"bank_{bank_csv.filename}"
            with open(b_path, "wb") as f:
                shutil.copyfileobj(bank_csv.file, f)
            txns.extend(parse_bank_csv(b_path, warnings))

        if stripe_csv and stripe_csv.filename:
            s_path = Path(temp_dir) / f"stripe_{stripe_csv.filename}"
            with open(s_path, "wb") as f:
                shutil.copyfileobj(stripe_csv.file, f)
            txns.extend(parse_stripe_csv(s_path, warnings))

        if invoices_csv and invoices_csv.filename:
            i_path = Path(temp_dir) / f"invoices_{invoices_csv.filename}"
            with open(i_path, "wb") as f:
                shutil.copyfileobj(invoices_csv.file, f)
            txns.extend(parse_invoices_csv(i_path, warnings))

        if receipts:
            r_paths = []
            for r in receipts:
                if r.filename:
                    r_path = Path(temp_dir) / f"rec_{r.filename}"
                    with open(r_path, "wb") as f:
                        shutil.copyfileobj(r.file, f)
                    r_paths.append(str(r_path))
            if r_paths:
                txns.extend(parse_receipts(r_paths, warnings))
    except Exception as e:
        warnings.append(f"Ingestion processing error: {e}")

    if not txns:
        warnings.append("No valid transactions found in uploaded files.")

    items = reconcile(txns)

    RUNS_STATUS[run_id] = "running"
    RUNS_EVENTS[run_id] = []
    RUNS_DB[run_id] = items

    asyncio.create_task(run_reconciliation_pipeline(run_id, txns, items))

    return UploadResponse(run_id=run_id, warnings=warnings)


@app.get("/api/runs/{run_id}", response_model=RunResponse)
def get_run(run_id: str):
    """Retrieves an existing reconciliation run by ID."""
    if run_id not in RUNS_DB:
        raise HTTPException(status_code=404, detail="Run not found")
    items = RUNS_DB[run_id]
    status = RUNS_STATUS.get(run_id, "completed")
    return RunResponse(run_id=run_id, status=status, items=items)


@app.get("/api/runs/{run_id}/events")
def get_run_events(run_id: str):
    """Retrieves all telemetry envelopes recorded for a run."""
    if run_id not in RUNS_EVENTS:
        raise HTTPException(status_code=404, detail="Run events not found")
    return RUNS_EVENTS[run_id]


@app.get("/api/runs/{run_id}/packet.md")
def get_packet(run_id: str):
    """
    Generates the accountant-ready Markdown report FROM RUNS_DB[run_id] AT REQUEST TIME.
    Never returns a stale or cached string.
    Guarantees explain+enrich has run so 'Waiting for AI analysis...' is never printed.
    """
    if run_id not in RUNS_DB:
        raise HTTPException(status_code=404, detail="Run not found")

    items = RUNS_DB[run_id]
    pending = [i for i in items if i.status == "exception" and not i.explanation]
    if pending:
        items = explain_exceptions(items)
        items = [enrich_exception(i) for i in items]
        RUNS_DB[run_id] = items

    markdown = generate_close_packet(items, company_name="Acme Global Enterprises")

    return PlainTextResponse(content=markdown, media_type="text/markdown")


@app.post("/api/runs/{run_id}/items/{item_id}/action")
async def record_human_action(run_id: str, item_id: str, payload: ActionRequest):
    """
    Records an accountant action on a reconciliation item.
    Updates the item's human_action and status, broadcasts an action_applied envelope,
    and returns the confirmation.
    """
    if run_id not in RUNS_DB:
        raise HTTPException(status_code=404, detail="Run not found")

    target_item = None
    for item in RUNS_DB[run_id]:
        if item.id == item_id:
            target_item = item
            break

    if not target_item:
        raise HTTPException(status_code=404, detail="Item not found")

    target_item.human_action = payload.action
    if payload.status:
        target_item.status = payload.status
    elif payload.action == "approve_match":
        target_item.status = "matched"
    else:
        target_item.status = "approved"

    envelope = make_envelope(
        event="action_applied",
        severity="info",
        payload={
            "run_id": run_id,
            "item_id": item_id,
            "action": target_item.human_action,
            "status": target_item.status,
            "note": payload.note,
        },
    )

    if run_id not in RUNS_EVENTS:
        RUNS_EVENTS[run_id] = []
    RUNS_EVENTS[run_id].append(envelope)

    await broadcast_telemetry(envelope)

    return {
        "success": True,
        "run_id": run_id,
        "item_id": item_id,
        "action": target_item.human_action,
        "status": target_item.status,
    }


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """
    Live WebSocket endpoint broadcasting real-time Contract C telemetry envelopes
    to all connected clients. Dead clients are cleaned up on disconnect.
    """
    await websocket.accept()
    CLIENTS.append(websocket)
    try:
        while True:
            # Keep listener open for ping/pong or client messages
            await websocket.receive_text()
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        if websocket in CLIENTS:
            CLIENTS.remove(websocket)
