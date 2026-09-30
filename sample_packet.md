# Month-End Close Packet: Acme Global Enterprises
*Generated on 2026-09-30 07:42 UTC by CloseProof*

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
| $1,000.00 | **EXCEPTION** | `approve_match` | Duplicate payout import detected: str_payout_1 and str_payout_2 both imported for 1000.0. | None |
| $890.00 | **EXCEPTION** | `contact_vendor` | Invoice #INV-1042 has no matching payment in tracked accounts | None |
| -$320.00 | **EXCEPTION** | `request_receipt` | Bank expense to OfficeDepot missing receipt documentation | None |
| -$147.00 | **EXCEPTION** | `write_off` | Bank service fee debit with no invoice/receipt | [www.chase.com](https://www.chase.com/business/checking/fees) |
| -$18.50 | **EXCEPTION** | `write_off` | Owner personal draw on business card | None |

---
## 3. ✅ Matched Transactions (3)

<details>
<summary><strong>Click to expand 3 verified matches</strong></summary>

- **-$500.00** (Confidence: `80%`) - bank: b_acme (merchant=ACME CONSULTING LLC); invoice: inv_acme (merchant=ACME LLC); bank: b_acme (amount=-500.0); invoice: inv_acme (amount=500.0) - *Fuzzy vendor match (100% similarity) between 'ACME CONSULTING LLC' and 'ACME LLC'.*
- **-$447.83** (Confidence: `80%`) - bank: b_fx (merchant=Cloud Services SAS); invoice: inv_fx (merchant=Cloud Services SAS); bank: b_fx (amount=-447.83); invoice: inv_fx (amount=410.0); invoice: inv_fx (fx_note=FX converted at 1.0923 with rounding diff) - *Fuzzy vendor match (100% similarity) between 'Cloud Services SAS' and 'Cloud Services SAS'. FX converted at 1.0923 with rounding diff*
- **$1,200.00** (Confidence: `85%`) - bank: b_split_net (amount=1200.0); stripe: str_gross (payout=1500.0); stripe: str_refund (refund=-300.0) - *Split match: Bank payout 1200.0 matched sum of 2 Stripe components.*

</details>

---
*CloseProof | Built on NVIDIA Open Models and Nebius AI Infrastructure*