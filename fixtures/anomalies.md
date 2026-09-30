# CloseProof Fixture Truth Table — 8 Planted Anomalies
Every anomaly MUST be detected by the eval harness with expected status and human_action.
| ID | Planted problem | Sources involved | Expected status | Expected human_action | Evidence that must be cited |
|----|----------------|------------------|-----------------|-----------------------|------------------------------|
| DUP-STRIPE | Same Stripe payout imported twice (2nd copy dated +1 day) | stripe export x2, bank | exception | approve_match (keep one, void duplicate) | both stripe doc_ids + bank ref |
| FEE-147 | $147.00 bank debit, no invoice/receipt anywhere | bank | exception | write_off (bank service fee) | bank memo field; Tavily fee-schedule lookup |
| MISSING-RECEIPT | $320.00 bank expense to "OfficeDepot", no receipt file | bank | exception | request_receipt | bank txn doc_id |
| VENDOR-VARIANT | Invoice "ACME LLC" paid; bank merchant reads "ACME CONSULTING LLC" | invoice, bank | matched (conf >=0.80) | approve_match | invoice doc_id + bank doc_id |
| FX-ROUND | EUR invoice 410.00 vs bank $447.83 (FX rounding diff $0.12) | invoice, bank | matched (tolerance) | approve_match | invoice doc_id, fx rate note |
| ORPHAN-INVOICE | Invoice #1042 never paid in any tracked account | invoice | exception | contact_vendor | invoice doc_id |
| PERSONAL | Owner's personal coffee $18.50 on business card | bank | exception | write_off (owner draw) | bank merchant + meta |
| REFUND-SPLIT | Stripe payout $1,200 = gross $1,500 minus refund $300 | stripe payouts+refunds, bank | matched (split) | approve_match | payout doc_id + refund doc_id |
Rules: amounts/dates internally consistent; 3 months of data; 40 invoices; 15 receipts; all synthetic.
