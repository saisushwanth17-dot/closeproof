from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class Txn:
    id: str
    source: str            # "bank" | "stripe" | "invoice" | "receipt" | "ledger"
    date: str              # ISO-8601 (YYYY-MM-DD)
    amount: float          # Signed, base currency
    currency: str          # e.g., "USD", "EUR"
    merchant: str
    merchant_norm: str     # Normalized merchant name (to be filled by CP-2 later)
    ref: Optional[str]     # Reference ID (e.g., invoice number, stripe payout ID)
    meta: Dict[str, Any]   # Any extra context (e.g., {"memo": "service fee"})
