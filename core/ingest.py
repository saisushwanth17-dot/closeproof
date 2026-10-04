"""
CloseProof File Ingestion Engine (core/ingest.py).
Provides heuristic column mapping and parsing for bank feeds, Stripe payout exports,
vendor invoices, and receipt images (via OCR batch job + Nemotron Nano).
"""

import csv
import io
import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
from .ledger import Txn
from .jobs import run_ocr_batch


def _normalize_merchant(name: str) -> str:
    """Normalizes vendor/merchant names for fuzzy comparison."""
    if not name:
        return ""
    norm = name.lower().strip()
    norm = re.sub(r"[^\w\s]", "", norm)
    # Strip common corporate designations
    norm = re.sub(r"\b(inc|llc|corp|corporation|ltd|limited|co|company|gmbh|sa|sas)\b", "", norm)
    return re.sub(r"\s+", " ", norm).strip()


def _clean_amount(val: Any) -> Optional[float]:
    """Cleans currency strings, handling negatives, accounting parens, and currency symbols."""
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None

    # Handle accounting parentheses: ($123.45) or (123.45) -> -123.45
    is_negative = False
    if s.startswith("(") and s.endswith(")"):
        is_negative = True
        s = s[1:-1].strip()

    # Strip currency symbols and commas
    s = re.sub(r"[$,€£¥]", "", s).strip()
    if s.startswith("-"):
        is_negative = True
        s = s[1:].strip()

    try:
        amt = float(s)
        return -amt if is_negative else amt
    except ValueError:
        return None


def _clean_date(val: Any) -> str:
    """Standardizes date strings to YYYY-MM-DD format."""
    s = str(val).strip()
    if not s:
        return "2026-09-01"

    # Already YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}", s):
        return s[:10]

    # MM/DD/YYYY or M/D/YYYY
    m = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})", s)
    if m:
        month, day, year = int(m.group(1)), int(m.group(2)), m.group(3)
        return f"{year}-{month:02d}-{day:02d}"

    # DD/MM/YYYY fallback or general
    return s[:10]


def _find_col(header_map: Dict[str, str], candidates: List[str]) -> Optional[str]:
    """Searches for candidate column names in lowercased header map."""
    for cand in candidates:
        for clean_col, orig_col in header_map.items():
            if cand == clean_col or cand in clean_col:
                return orig_col
    return None


def _read_csv_rows(path_or_file: Union[str, Path, io.IOBase]) -> tuple[List[Dict[str, str]], List[str]]:
    """Reads CSV rows with encoding resilience."""
    if isinstance(path_or_file, (str, Path)):
        p = Path(path_or_file)
        if not p.exists():
            return [], [f"File not found: {p}"]
        # Try UTF-8 then fallback
        try:
            with open(p, "r", encoding="utf-8-sig", errors="replace") as f:
                reader = csv.DictReader(f)
                return list(reader), []
        except Exception as e:
            return [], [f"Failed to read CSV {p.name}: {e}"]
    else:
        # File-like object
        try:
            content = path_or_file.read()
            if isinstance(content, bytes):
                content = content.decode("utf-8", errors="replace")
            reader = csv.DictReader(io.StringIO(content))
            return list(reader), []
        except Exception as e:
            return [], [f"Failed to read file-like CSV: {e}"]


def parse_bank_csv(
    path_or_file: Union[str, Path, io.IOBase],
    warnings: Optional[List[str]] = None,
) -> List[Txn]:
    """
    Parses bank transaction CSV export using heuristic column mapping.
    Maps: date, amount (or debit/credit split), description/merchant, ref/id.
    """
    rows, errs = _read_csv_rows(path_or_file)
    if warnings is not None:
        warnings.extend(errs)
    if not rows:
        return []

    sample_row = rows[0]
    header_map = {re.sub(r"[^\w]", "", k.lower()): k for k in sample_row.keys()}

    date_col = _find_col(header_map, ["date", "txndate", "transactiondate", "posteddate", "time"])
    amount_col = _find_col(header_map, ["amount", "total", "net", "sum", "value"])
    debit_col = _find_col(header_map, ["debit", "withdrawal", "spent", "charge"])
    credit_col = _find_col(header_map, ["credit", "deposit", "received"])
    desc_col = _find_col(header_map, ["description", "merchant", "payee", "memo", "details", "narrative", "name"])
    ref_col = _find_col(header_map, ["ref", "reference", "id", "txnid", "check", "checknum"])

    if not date_col and warnings is not None:
        warnings.append("Bank CSV: Unmapped date column. Using fallback dates.")
    if not amount_col and not (debit_col or credit_col) and warnings is not None:
        warnings.append("Bank CSV: Unmapped amount column. Transactions may have 0 amount.")

    txns: List[Txn] = []
    for idx, row in enumerate(rows):
        date_val = _clean_date(row.get(date_col, "")) if date_col else "2026-09-01"

        amt: float = 0.0
        if amount_col and row.get(amount_col):
            parsed = _clean_amount(row.get(amount_col))
            amt = parsed if parsed is not None else 0.0
        elif debit_col or credit_col:
            deb = _clean_amount(row.get(debit_col)) or 0.0 if debit_col else 0.0
            cred = _clean_amount(row.get(credit_col)) or 0.0 if credit_col else 0.0
            amt = cred - abs(deb)

        desc = row.get(desc_col, "").strip() if desc_col else f"Bank Txn {idx+1}"
        ref_val = row.get(ref_col, "").strip() if ref_col else None

        txn_id = f"bank_row_{idx+1}" if not ref_val else f"bank_{ref_val}"
        txns.append(
            Txn(
                id=txn_id,
                source="bank",
                date=date_val,
                amount=amt,
                currency="USD",
                merchant=desc,
                merchant_norm=_normalize_merchant(desc),
                ref=ref_val,
                meta={"raw_row": idx + 1, "memo": desc},
            )
        )

    return txns


def parse_stripe_csv(
    path_or_file: Union[str, Path, io.IOBase],
    warnings: Optional[List[str]] = None,
) -> List[Txn]:
    """
    Parses Stripe payout or balance history CSV export using heuristic column mapping.
    Maps: created/date, amount/net, description, payout_id/id.
    """
    rows, errs = _read_csv_rows(path_or_file)
    if warnings is not None:
        warnings.extend(errs)
    if not rows:
        return []

    sample_row = rows[0]
    header_map = {re.sub(r"[^\w]", "", k.lower()): k for k in sample_row.keys()}

    date_col = _find_col(header_map, ["created", "createdutc", "date", "availableon"])
    amount_col = _find_col(header_map, ["amount", "net", "gross", "total"])
    desc_col = _find_col(header_map, ["description", "type", "reportingcategory", "memo"])
    ref_col = _find_col(header_map, ["id", "payoutid", "transferid", "balancetransactionid", "source"])
    curr_col = _find_col(header_map, ["currency", "payoutcurrency"])

    if not date_col and warnings is not None:
        warnings.append("Stripe CSV: Unmapped date column. Using fallback dates.")
    if not amount_col and warnings is not None:
        warnings.append("Stripe CSV: Unmapped amount column.")

    txns: List[Txn] = []
    for idx, row in enumerate(rows):
        date_val = _clean_date(row.get(date_col, "")) if date_col else "2026-09-01"
        amt_raw = _clean_amount(row.get(amount_col)) if amount_col else 0.0
        amt = amt_raw if amt_raw is not None else 0.0

        desc = row.get(desc_col, "").strip() if desc_col else "Stripe Payout"
        ref_val = row.get(ref_col, "").strip() if ref_col else None
        curr = row.get(curr_col, "USD").strip().upper() if curr_col else "USD"

        txn_id = f"str_row_{idx+1}" if not ref_val else f"str_{ref_val}"
        txns.append(
            Txn(
                id=txn_id,
                source="stripe",
                date=date_val,
                amount=amt,
                currency=curr or "USD",
                merchant="Stripe",
                merchant_norm="stripe",
                ref=ref_val,
                meta={"raw_row": idx + 1, "memo": desc},
            )
        )

    return txns


def parse_invoices_csv(
    path_or_file: Union[str, Path, io.IOBase],
    warnings: Optional[List[str]] = None,
) -> List[Txn]:
    """
    Parses vendor accounts payable / invoices CSV export using heuristic column mapping.
    Maps: date/due_date, amount/total, vendor/merchant, invoice_number/ref.
    """
    rows, errs = _read_csv_rows(path_or_file)
    if warnings is not None:
        warnings.extend(errs)
    if not rows:
        return []

    sample_row = rows[0]
    header_map = {re.sub(r"[^\w]", "", k.lower()): k for k in sample_row.keys()}

    date_col = _find_col(header_map, ["invoicedate", "duedate", "date", "issuedate", "created"])
    amount_col = _find_col(header_map, ["amount", "total", "totalamount", "balance", "net"])
    vendor_col = _find_col(header_map, ["vendor", "vendorname", "merchant", "supplier", "payee", "biller", "company"])
    ref_col = _find_col(header_map, ["invoicenumber", "invoicenum", "invoiceid", "ref", "id", "ponumber"])
    curr_col = _find_col(header_map, ["currency", "invoicecurrency"])

    if not date_col and warnings is not None:
        warnings.append("Invoices CSV: Unmapped date column. Using fallback dates.")
    if not amount_col and warnings is not None:
        warnings.append("Invoices CSV: Unmapped amount column.")
    if not vendor_col and warnings is not None:
        warnings.append("Invoices CSV: Unmapped vendor/merchant column.")

    txns: List[Txn] = []
    for idx, row in enumerate(rows):
        date_val = _clean_date(row.get(date_col, "")) if date_col else "2026-09-01"
        amt_raw = _clean_amount(row.get(amount_col)) if amount_col else 0.0
        amt = amt_raw if amt_raw is not None else 0.0

        vendor = row.get(vendor_col, "").strip() if vendor_col else f"Vendor {idx+1}"
        ref_val = row.get(ref_col, "").strip() if ref_col else None
        curr = row.get(curr_col, "USD").strip().upper() if curr_col else "USD"

        txn_id = f"inv_row_{idx+1}" if not ref_val else f"inv_{ref_val}"
        txns.append(
            Txn(
                id=txn_id,
                source="invoice",
                date=date_val,
                amount=abs(amt),  # Invoices are positive receivable/payable representations
                currency=curr or "USD",
                merchant=vendor,
                merchant_norm=_normalize_merchant(vendor),
                ref=ref_val,
                meta={"raw_row": idx + 1, "vendor": vendor},
            )
        )

    return txns


def parse_receipts(
    file_paths: List[str],
    warnings: Optional[List[str]] = None,
) -> List[Txn]:
    """
    Parses scanned receipt images/PDFs through core.jobs.run_ocr_batch.
    Uses Nemotron Nano structured extraction to produce normalized Txn objects.
    """
    if not file_paths:
        return []

    try:
        ocr_results = run_ocr_batch(file_paths)
    except Exception as e:
        if warnings is not None:
            warnings.append(f"Receipt OCR batch error: {e}")
        return []

    txns: List[Txn] = []
    for idx, res in enumerate(ocr_results):
        fp = file_paths[idx] if idx < len(file_paths) else f"receipt_{idx+1}"
        if res.get("error") and warnings is not None:
            warnings.append(f"Receipt {Path(fp).name}: OCR unreadable ({res['error']})")

        merchant = res.get("merchant", "Receipt Vendor")
        date_val = _clean_date(res.get("date", "2026-09-15"))
        total_val = float(res.get("total", 0.0))
        curr = str(res.get("currency", "USD"))

        txns.append(
            Txn(
                id=f"rec_ocr_{idx+1}_{Path(fp).stem}",
                source="receipt",
                date=date_val,
                amount=-abs(total_val),  # Receipts are expenses
                currency=curr,
                merchant=merchant,
                merchant_norm=_normalize_merchant(merchant),
                ref=None,
                meta={"file": Path(fp).name, "ocr_extracted": True},
            )
        )

    return txns
