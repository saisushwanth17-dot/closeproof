# Month-End Close Packet: Acme Global Enterprises
*Generated on 2026-10-04 05:40 UTC by CloseProof*

---
## 1. Executive Summary

| Metric | Value |
|---|---|
| **Total Items Processed** | 8 |
| **Match Rate** | **37.5%** (3 matched / 8 total) |
| **Total Reconciled Volume** | $2,147.83 |
| **Total Unreconciled Exceptions** | **$2,375.50** (5 exceptions) |

---
## 2. 🚨 Exceptions Requiring Human Action

Every exception carries required human decision, supporting evidence, and citations.
Sorted by largest dollar impact first.

| Amount | Status | Human Action | Explanation | Citations |
|---|---|---|---|---|
| $1,000.00 | **EXCEPTION** | `approve_match` | Duplicate payout import identified with identical transfer reference across multiple batches. | str_dup_1_str_dup_2, str_dup_1, bank_payout_dup, str_dup_2 |
| $890.00 | **EXCEPTION** | `contact_vendor` | Invoice for $890.00 remains outstanding with no corresponding bank settlement recorded. | inv_orphan_1042 |
| -$320.00 | **EXCEPTION** | `request_receipt` | Disbursement of $320.00 to OfficeDepot lacks required itemized receipt documentation. | bank_depot_320 |
| -$147.00 | **EXCEPTION** | `write_off` | Bank debit of $147.00 reflects a recurring account service fee without matching invoice documentation. | bank_fee_147 |
| -$18.50 | **EXCEPTION** | `write_off` | Bank debit of $18.50 reflects a recurring account service fee without matching invoice documentation. | bank_coffee_18 |

---
## 3. ✅ Matched Transactions (3)

<details>
<summary><strong>Click to expand 3 verified matches</strong></summary>

- **-$500.00** (Confidence: `80%`) - bank: bank_acme_500 (merchant=ACME CONSULTING LLC); invoice: inv_acme_500 (merchant=ACME LLC); bank: bank_acme_500 (amount=-500.0); invoice: inv_acme_500 (amount=500.0) - *Fuzzy vendor match (100% similarity) between 'ACME CONSULTING LLC' and 'ACME LLC'.*
- **-$447.83** (Confidence: `80%`) - bank: bank_usd_447 (merchant=Cloud Services SAS); invoice: inv_eur_410 (merchant=Cloud Services SAS); bank: bank_usd_447 (amount=-447.83); invoice: inv_eur_410 (amount=410.0); invoice: inv_eur_410 (fx_note=FX converted at 1.0923 with rounding diff) - *Fuzzy vendor match (100% similarity) between 'Cloud Services SAS' and 'Cloud Services SAS'. FX converted at 1.0923 with rounding diff*
- **$1,200.00** (Confidence: `85%`) - bank: bank_split_1200 (amount=1200.0); stripe: str_gross_1500 (payout=1500.0); stripe: str_refund_300 (refund=-300.0) - *Split match: Bank payout 1200.0 matched sum of 2 Stripe components.*

</details>

---
*CloseProof | Built on NVIDIA Open Models and Nebius AI Infrastructure*