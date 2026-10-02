# CloseProof Accountant-Ready Close Packet

**Run ID:** `01JB0000000000000000000001`  
**Close Period:** September 2026  
**Generated At:** 2026-10-02 12:00:12 UTC  
**Provenance:** Synthetic Replay Sample (Verification & Demo)

---

## Executive Summary

- **Total Transactions Examined:** 24
- **Reconciled Transactions:** 16 (66.7%)
- **Unresolved Exceptions:** 8 (33.3%)
- **Total Gross Unreconciled Volume:** $9,820.79
- **Actions Requiring Human Approval:** 8

> **Important Notice:** CloseProof produces proof, not silent ledger changes. All reconciliation actions and suggested adjustments listed in this packet require explicit review and manual sign-off by an authorized accountant.

---

## Unresolved Exceptions Awaiting Human Approval

### 1. `rec_01jb_fee147` — Commercial Bank Wire Service Fee
- **Amount:** -$147.00
- **Confidence:** 88% (Recon Core) / 90% (Nemotron Ultra Rationale)
- **Status:** Unrecorded Bank Charge
- **Required Action:** `approve_match`
- **Audit Findings:** Bank statement debit line `stmt_line_441` describes `COMMERCIAL WIRE SVC CHG -$147.00`. External tariff verification matches standard commercial wire fee schedule.
- **Auditor Note:** Transaction represents an unrecorded bank maintenance charge from commercial wire operations. Recommend approving match to Bank Operating Account charges.

### 2. `rec_01jb_dupstripe` — Duplicate Stripe Import
- **Amount:** $1,250.00
- **Confidence:** 80%
- **Status:** Duplicate Ingestion
- **Required Action:** `write_off`
- **Audit Findings:** Duplicate payout record matching external charge ID `ch_dup_1`.

### 3. `rec_01jb_missreceipt` — Office Supplies Store
- **Amount:** -$89.50
- **Confidence:** 70%
- **Status:** Documentation Gap
- **Required Action:** `request_receipt`
- **Audit Findings:** Corporate debit card transaction without supporting document.

### 4. `rec_01jb_vendorvar` — ACME Consulting LLC
- **Amount:** -$3,400.00
- **Confidence:** 85%
- **Status:** Vendor Name Discrepancy
- **Required Action:** `approve_match`
- **Audit Findings:** Vendor record matches master vendor registry despite billing alias variance.

### 5. `rec_01jb_eurfx` — EUR Exchange Conversion
- **Amount:** -$0.04
- **Confidence:** 90%
- **Status:** FX Rounding Imbalance
- **Required Action:** `approve_match`
- **Audit Findings:** Fractional cent conversion delta across bank and invoice settlement currency feeds.

### 6. `rec_01jb_orphaninvo` — Client Services Retainer
- **Amount:** $4,500.00
- **Confidence:** 60%
- **Status:** Aged Receivable / Missing Deposit
- **Required Action:** `escalate_accountant`
- **Audit Findings:** Unpaid receivable past 45-day aging threshold without recorded settlement.

### 7. `rec_01jb_ownercoffee` — Cafe Purchase
- **Amount:** -$14.25
- **Confidence:** 75%
- **Status:** Non-Business Expense Flag
- **Required Action:** `contact_vendor`
- **Audit Findings:** Disallowed personal transaction on corporate expense account.

### 8. `rec_01jb_striperefund` — Customer Dispute Refund
- **Amount:** -$420.00
- **Confidence:** 85%
- **Status:** Net Payout Offset
- **Required Action:** `approve_match`
- **Audit Findings:** Batch payout adjustment for processed customer chargeback.

---

## Verification & Model Provenance

- **Extraction & Normalization Tier:** Nemotron Nano
- **Forensic Explanation Tier:** Nemotron Ultra
- **Search Verification:** Tavily Search API
- **Reconciliation Engine:** Deterministic Code Math
