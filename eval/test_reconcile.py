import unittest
from core.ledger import Txn
from core.reconcile import reconcile, ReconItem


class TestReconciliation(unittest.TestCase):
    def test_dup_stripe(self):
        txns = [
            Txn(id="bank_01", source="bank", date="2026-09-01", amount=1000.0, currency="USD", merchant="Stripe Transfer", merchant_norm="stripe", ref="po_123", meta={}),
            Txn(id="stripe_01", source="stripe", date="2026-09-01", amount=1000.0, currency="USD", merchant="Stripe", merchant_norm="stripe", ref="po_123", meta={}),
            Txn(id="stripe_02", source="stripe", date="2026-09-02", amount=1000.0, currency="USD", merchant="Stripe", merchant_norm="stripe", ref="po_123", meta={}),
        ]
        items = reconcile(txns)
        dup_items = [item for item in items if "dup" in item.id]
        self.assertEqual(len(dup_items), 1)
        dup = dup_items[0]
        self.assertEqual(dup.status, "exception")
        self.assertEqual(dup.human_action, "approve_match")
        doc_ids = {c.doc_id for c in dup.candidates}
        self.assertIn("stripe_01", doc_ids)
        self.assertIn("stripe_02", doc_ids)

    def test_fee_147(self):
        txns = [
            Txn(id="bank_fee", source="bank", date="2026-09-05", amount=-147.0, currency="USD", merchant="Chase", merchant_norm="chase", ref=None, meta={"memo": "Monthly bank service fee", "anomaly_id": "FEE-147"})
        ]
        items = reconcile(txns)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].status, "exception")
        self.assertEqual(items[0].human_action, "write_off")

    def test_missing_receipt(self):
        txns = [
            Txn(id="bank_exp", source="bank", date="2026-09-08", amount=-320.0, currency="USD", merchant="OfficeDepot", merchant_norm="officedepot", ref=None, meta={"memo": "Office supplies", "anomaly_id": "MISSING-RECEIPT"})
        ]
        items = reconcile(txns)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].status, "exception")
        self.assertEqual(items[0].human_action, "request_receipt")

    def test_vendor_variant(self):
        txns = [
            Txn(id="inv_acme", source="invoice", date="2026-09-10", amount=500.0, currency="USD", merchant="ACME LLC", merchant_norm="acme llc", ref="INV-101", meta={}),
            Txn(id="bank_acme", source="bank", date="2026-09-11", amount=500.0, currency="USD", merchant="ACME CONSULTING LLC", merchant_norm="acme consulting llc", ref=None, meta={}),
        ]
        items = reconcile(txns)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].status, "matched")
        self.assertGreaterEqual(items[0].confidence, 0.80)
        self.assertEqual(items[0].human_action, "approve_match")

    def test_fx_round(self):
        txns = [
            Txn(id="inv_eur", source="invoice", date="2026-09-15", amount=410.0, currency="EUR", merchant="Cloud Services SAS", merchant_norm="cloud services", ref="INV-EUR-1", meta={"fx_rate": 1.0925}),
            Txn(id="bank_usd", source="bank", date="2026-09-16", amount=447.83, currency="USD", merchant="Cloud Services", merchant_norm="cloud services", ref=None, meta={}),
        ]
        items = reconcile(txns)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].status, "matched")
        self.assertEqual(items[0].human_action, "approve_match")

    def test_orphan_invoice(self):
        txns = [
            Txn(id="inv_1042", source="invoice", date="2026-09-20", amount=890.0, currency="USD", merchant="Global Freight", merchant_norm="global freight", ref="INV-1042", meta={"anomaly_id": "ORPHAN-INVOICE"})
        ]
        items = reconcile(txns)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].status, "exception")
        self.assertEqual(items[0].human_action, "contact_vendor")

    def test_personal(self):
        txns = [
            Txn(id="bank_coffee", source="bank", date="2026-09-22", amount=-18.50, currency="USD", merchant="Blue Bottle Coffee", merchant_norm="blue bottle coffee", ref=None, meta={"memo": "Personal coffee run", "anomaly_id": "PERSONAL"})
        ]
        items = reconcile(txns)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].status, "exception")
        self.assertEqual(items[0].human_action, "write_off")

    def test_refund_split(self):
        txns = [
            Txn(id="bank_net", source="bank", date="2026-09-25", amount=1200.0, currency="USD", merchant="Stripe Transfer", merchant_norm="stripe", ref=None, meta={}),
            Txn(id="stripe_gross", source="stripe", date="2026-09-25", amount=1500.0, currency="USD", merchant="Stripe", merchant_norm="stripe", ref="ch_gross", meta={}),
            Txn(id="stripe_ref", source="stripe", date="2026-09-25", amount=-300.0, currency="USD", merchant="Stripe", merchant_norm="stripe", ref="re_refund", meta={}),
        ]
        items = reconcile(txns)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].status, "matched")
        self.assertEqual(items[0].human_action, "approve_match")
        doc_ids = {c.doc_id for c in items[0].candidates}
        self.assertIn("stripe_gross", doc_ids)
        self.assertIn("stripe_ref", doc_ids)


if __name__ == "__main__":
    unittest.main()
