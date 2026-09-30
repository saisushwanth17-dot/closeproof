from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid

# Import our core engine
from core.ledger import Txn
from core.reconcile import reconcile, ReconItem, Evidence
from core.packet import generate_close_packet

app = FastAPI(title="CloseProof API", version="1.0")

# Allow the frontend (Next.js) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In prod, lock this down. For hackathon, "*" is fine.
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for hackathon demo (CP-3 will move this to a DB later if needed)
RUNS_DB: Dict[str, List[ReconItem]] = {}


class RunResponse(BaseModel):
    run_id: str
    status: str
    items: List[ReconItem]


def get_mock_transactions() -> List[Txn]:
    """
    Generates a curated dataset of transactions triggering all 8 planted anomalies
    from fixtures/anomalies.md:
      1. DUP-STRIPE: Same Stripe payout imported twice (+1 day diff), single bank entry
      2. FEE-147: $147.00 bank debit with service fee memo, no invoice/receipt
      3. MISSING-RECEIPT: $320.00 bank expense to OfficeDepot with no receipt file
      4. VENDOR-VARIANT: Invoice "ACME LLC" vs Bank "ACME CONSULTING LLC" ($500.00)
      5. FX-ROUND: EUR invoice 410.00 vs bank $447.83 (FX rounding diff $0.12)
      6. ORPHAN-INVOICE: Invoice #1042 ($890.00) never paid in any tracked account
      7. PERSONAL: Owner's personal coffee $18.50 on business credit card
      8. REFUND-SPLIT: Stripe payout $1,200 = gross $1,500 minus refund $300
    """
    return [
        # --- 1. DUP-STRIPE (stripe export x2, bank) ---
        Txn(
            id="bank_payout_dup",
            source="bank",
            date="2026-09-02",
            amount=1000.0,
            currency="USD",
            merchant="Stripe Transfer",
            merchant_norm="stripe",
            ref="po_stripe_dup",
            meta={"memo": "STRIPE PAYOUT po_stripe_dup"}
        ),
        Txn(
            id="str_dup_1",
            source="stripe",
            date="2026-09-01",
            amount=1000.0,
            currency="USD",
            merchant="Stripe",
            merchant_norm="stripe",
            ref="po_stripe_dup",
            meta={"export": "stripe_export_batch_1.csv"}
        ),
        Txn(
            id="str_dup_2",
            source="stripe",
            date="2026-09-02",
            amount=1000.0,
            currency="USD",
            merchant="Stripe",
            merchant_norm="stripe",
            ref="po_stripe_dup",
            meta={"export": "stripe_export_batch_2.csv"}
        ),

        # --- 2. FEE-147 (bank debit, no invoice/receipt) ---
        Txn(
            id="bank_fee_147",
            source="bank",
            date="2026-09-05",
            amount=-147.0,
            currency="USD",
            merchant="JPMorgan Chase",
            merchant_norm="chase",
            ref=None,
            meta={"memo": "Monthly commercial account analysis service fee", "anomaly_id": "FEE-147"}
        ),

        # --- 3. MISSING-RECEIPT (bank expense, no receipt file) ---
        Txn(
            id="bank_depot_320",
            source="bank",
            date="2026-09-08",
            amount=-320.0,
            currency="USD",
            merchant="OfficeDepot",
            merchant_norm="officedepot",
            ref=None,
            meta={"memo": "In-store POS purchase - Office desks and printer supplies", "anomaly_id": "MISSING-RECEIPT"}
        ),

        # --- 4. VENDOR-VARIANT (Invoice 'ACME LLC', Bank 'ACME CONSULTING LLC') ---
        Txn(
            id="inv_acme_500",
            source="invoice",
            date="2026-09-10",
            amount=500.0,
            currency="USD",
            merchant="ACME LLC",
            merchant_norm="acme llc",
            ref="INV-1041",
            meta={"terms": "Net 30"}
        ),
        Txn(
            id="bank_acme_500",
            source="bank",
            date="2026-09-12",
            amount=-500.0,
            currency="USD",
            merchant="ACME CONSULTING LLC",
            merchant_norm="acme consulting llc",
            ref=None,
            meta={"memo": "ACH Wire vendor payment ACME CONSULTING"}
        ),

        # --- 5. FX-ROUND (EUR invoice 410.00 vs USD bank $447.83, rounding diff $0.12) ---
        Txn(
            id="inv_eur_410",
            source="invoice",
            date="2026-09-15",
            amount=410.0,
            currency="EUR",
            merchant="Cloud Services SAS",
            merchant_norm="cloud services",
            ref="INV-EUR-99",
            meta={"fx_rate": 1.092268, "fx_note": "Spot rate 1.092268 EUR/USD"}
        ),
        Txn(
            id="bank_usd_447",
            source="bank",
            date="2026-09-16",
            amount=-447.83,
            currency="USD",
            merchant="Cloud Services SAS",
            merchant_norm="cloud services",
            ref=None,
            meta={"memo": "International settlement Cloud Services SAS"}
        ),

        # --- 6. ORPHAN-INVOICE (Invoice #1042 never paid in any account) ---
        Txn(
            id="inv_orphan_1042",
            source="invoice",
            date="2026-09-20",
            amount=890.0,
            currency="USD",
            merchant="Global Logistics Corp",
            merchant_norm="global logistics",
            ref="INV-1042",
            meta={"memo": "Freight shipping dispatch", "anomaly_id": "ORPHAN-INVOICE"}
        ),

        # --- 7. PERSONAL (Owner's personal coffee $18.50 on business card) ---
        Txn(
            id="bank_coffee_18",
            source="bank",
            date="2026-09-22",
            amount=-18.50,
            currency="USD",
            merchant="Blue Bottle Coffee",
            merchant_norm="blue bottle coffee",
            ref=None,
            meta={"memo": "Morning coffee - Business card ending 4402", "anomaly_id": "PERSONAL"}
        ),

        # --- 8. REFUND-SPLIT (Stripe payout $1,200 = gross $1,500 minus refund $300) ---
        Txn(
            id="bank_split_1200",
            source="bank",
            date="2026-09-25",
            amount=1200.0,
            currency="USD",
            merchant="Stripe Transfer",
            merchant_norm="stripe",
            ref=None,
            meta={"memo": "Stripe Net Settlement Batch #9921"}
        ),
        Txn(
            id="str_gross_1500",
            source="stripe",
            date="2026-09-25",
            amount=1500.0,
            currency="USD",
            merchant="Stripe",
            merchant_norm="stripe",
            ref="po_gross_1500",
            meta={"description": "Gross sales payout batch"}
        ),
        Txn(
            id="str_refund_300",
            source="stripe",
            date="2026-09-25",
            amount=-300.0,
            currency="USD",
            merchant="Stripe",
            merchant_norm="stripe",
            ref="re_refund_300",
            meta={"description": "Customer refund offset"}
        ),
    ]


@app.get("/")
def root():
    """Root endpoint health check."""
    return {"message": "CloseProof API is live. Built on Nebius & NVIDIA."}


@app.post("/api/run", response_model=RunResponse)
@app.post("/api/runs", response_model=RunResponse)
def start_reconciliation():
    """
    Triggers a reconciliation run over the fixture transactions for the demo.
    Detects all 8 planted anomalies and stores results in RUNS_DB.
    """
    run_id = str(uuid.uuid4())
    mock_txns = get_mock_transactions()

    items = reconcile(mock_txns)

    # Attach citations where applicable (e.g. Chase fee schedule for $147)
    for item in items:
        if abs(abs(item.amount) - 147.0) < 0.01:
            item.citations = ["https://www.chase.com/business/checking/fees"]

    RUNS_DB[run_id] = items

    return RunResponse(run_id=run_id, status="completed", items=items)


@app.get("/api/runs/{run_id}", response_model=RunResponse)
def get_run(run_id: str):
    """Retrieves an existing reconciliation run by ID."""
    if run_id not in RUNS_DB:
        raise HTTPException(status_code=404, detail="Run not found")
    items = RUNS_DB[run_id]
    return RunResponse(run_id=run_id, status="completed", items=items)


@app.get("/api/runs/{run_id}/packet.md")
def get_packet(run_id: str):
    """Returns the raw Markdown report for the frontend to render or download."""
    if run_id not in RUNS_DB:
        raise HTTPException(status_code=404, detail="Run not found")

    items = RUNS_DB[run_id]
    markdown = generate_close_packet(items, company_name="Acme Global Enterprises")

    return PlainTextResponse(content=markdown, media_type="text/markdown")
