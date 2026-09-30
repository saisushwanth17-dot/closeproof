import unittest
import os
from core.ledger import Txn
from core.reconcile import reconcile, ReconItem, Evidence
from core.packet import generate_close_packet, save_packet


class TestPacket(unittest.TestCase):
    def test_packet_generation(self):
        # Create a sample list of ReconItems (matches + exceptions with citations)
        items = [
            ReconItem(
                id="match_01",
                amount=1200.0,
                status="matched",
                confidence=0.95,
                explanation="Exact ref match",
                candidates=[Evidence(source="bank", doc_id="b1", field="amount", value="1200.0")]
            ),
            ReconItem(
                id="exc_fee",
                amount=-147.0,
                status="exception",
                confidence=0.0,
                explanation="Bank service fee debit with no invoice/receipt",
                citations=["https://chase.com/fee-schedule"],
                human_action="write_off",
                candidates=[Evidence(source="bank", doc_id="b_fee", field="memo", value="Monthly fee")]
            ),
            ReconItem(
                id="exc_coffee",
                amount=-18.50,
                status="exception",
                confidence=0.0,
                explanation="Personal coffee purchase",
                citations=[],
                human_action="write_off",
                candidates=[Evidence(source="bank", doc_id="b_coffee", field="merchant", value="Starbucks")]
            ),
            ReconItem(
                id="exc_supplies",
                amount=-320.0,
                status="exception",
                confidence=0.0,
                explanation=None,  # Tests 'Waiting for AI analysis...'
                citations=[],
                human_action="request_receipt",
                candidates=[Evidence(source="bank", doc_id="b_supplies", field="merchant", value="OfficeDepot")]
            ),
        ]

        md = generate_close_packet(items, company_name="CloseProof Demo LLC")

        # 1. Executive Summary checks
        self.assertIn("# Month-End Close Packet: CloseProof Demo LLC", md)
        self.assertIn("Total Items Processed", md)
        self.assertIn("Match Rate", md)
        self.assertIn("25.0%", md)  # 1 matched out of 4 = 25%

        # 2. Exceptions table checks
        self.assertIn("| Amount | Status | Human Action | Explanation | Citations |", md)
        self.assertIn("Waiting for AI analysis...", md)  # Fallback for None explanation
        self.assertIn("[chase.com](https://chase.com/fee-schedule)", md)  # Formatted URL citation

        # Check sorting: $320.00 must come before $147.00, and $147.00 before $18.50
        idx_320 = md.find("$320.00")
        idx_147 = md.find("$147.00")
        idx_18 = md.find("$18.50")
        self.assertTrue(idx_320 < idx_147 < idx_18, "Exceptions table must be sorted by absolute amount descending")

        # 3. Matched transactions checks
        self.assertIn("verified matches", md.lower())
        self.assertIn("Confidence: `95%`", md)

        # 4. Test save_packet
        test_filename = "test_close_packet.md"
        try:
            save_packet(md, test_filename)
            self.assertTrue(os.path.exists(test_filename))
            with open(test_filename, "r", encoding="utf-8") as f:
                content = f.read()
            self.assertEqual(content, md)
        finally:
            if os.path.exists(test_filename):
                os.remove(test_filename)

    def test_reconcile_to_packet_pipeline(self):
        # Run real reconcile output through packet generation
        txns = [
            Txn(id="b1", source="bank", date="2026-09-01", amount=500.0, currency="USD", merchant="ACME CONSULTING LLC", merchant_norm="acme", ref=None, meta={}),
            Txn(id="i1", source="invoice", date="2026-09-02", amount=500.0, currency="USD", merchant="ACME LLC", merchant_norm="acme", ref="INV-1", meta={}),
            Txn(id="b2", source="bank", date="2026-09-05", amount=-147.0, currency="USD", merchant="Bank", merchant_norm="bank", ref=None, meta={"memo": "service fee", "anomaly_id": "FEE-147"}),
        ]
        items = reconcile(txns)
        md = generate_close_packet(items, company_name="Pipeline Test Corp")
        self.assertIn("Pipeline Test Corp", md)
        self.assertIn("`write_off`", md)
        self.assertIn("ACME", md)


if __name__ == "__main__":
    unittest.main()
