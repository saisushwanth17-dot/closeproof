"""
Evaluation harness for CloseProof explanation engine and citation integrity.
Tests 10 canonical cases (8 planted anomalies + 2 matched controls).
Verifies:
  1. Exceptions get non-null forensic explanations.
  2. Zero invented doc_ids: EVERY citation is a provided doc_id or real Tavily URL.
  3. recommended_action strictly in the 5-value enum.
  4. confidence in [0.0, 1.0].
  5. On simulated Tavily timeout, citations == [] and explanation contains 'External verification unavailable'.
Works in both NEBIUS_MOCK=1 mode and live keys mode.
"""

import os
import unittest
from unittest.mock import patch
from typing import List

from core.reconcile import ReconItem, Evidence
from core.explain import explain_exceptions, ALLOWED_ACTIONS
from core.enrich import enrich_exception, ENRICHMENT_TEMPLATES, get_enrichment_query


def build_10_eval_cases() -> List[ReconItem]:
    """
    Constructs the 10 canonical test cases:
      - 8 planted anomalies (covering DUP-STRIPE, FEE-147, MISSING-RECEIPT, VENDOR-VARIANT,
        FX-ROUND, ORPHAN-INVOICE, PERSONAL, REFUND-SPLIT)
      - 2 matched controls
    """
    return [
        # --- 1. DUP-STRIPE (Duplicate Stripe payout import) ---
        ReconItem(
            id="anom_dup_stripe",
            amount=1000.0,
            status="exception",
            human_action="approve_match",
            candidates=[
                Evidence(source="stripe", doc_id="str_dup_1", field="amount", value="1000.0"),
                Evidence(source="stripe", doc_id="str_dup_2", field="amount", value="1000.0"),
                Evidence(source="bank", doc_id="bank_payout_dup", field="ref", value="po_stripe_dup"),
                Evidence(source="rule_engine", doc_id="rule_dup_01", field="rule_hint", value="Duplicate payout import detected"),
            ],
            confidence=0.50,
        ),
        # --- 2. FEE-147 (Bank fee debit with no invoice) ---
        ReconItem(
            id="anom_fee_147",
            amount=-147.0,
            status="exception",
            human_action="write_off",
            candidates=[
                Evidence(source="bank", doc_id="bank_fee_147", field="amount", value="-147.0"),
                Evidence(source="bank", doc_id="bank_fee_147", field="memo", value="Monthly commercial account analysis service fee"),
                Evidence(source="bank", doc_id="bank_fee_147", field="merchant", value="JPMorgan Chase"),
            ],
            confidence=0.0,
        ),
        # --- 3. MISSING-RECEIPT (Office expense with no receipt document) ---
        ReconItem(
            id="anom_missing_receipt",
            amount=-320.0,
            status="exception",
            human_action="request_receipt",
            candidates=[
                Evidence(source="bank", doc_id="bank_depot_320", field="amount", value="-320.0"),
                Evidence(source="bank", doc_id="bank_depot_320", field="memo", value="In-store POS purchase - Office supplies"),
                Evidence(source="bank", doc_id="bank_depot_320", field="merchant", value="OfficeDepot"),
            ],
            confidence=0.0,
        ),
        # --- 4. VENDOR-VARIANT (Fuzzy vendor name discrepancy) ---
        ReconItem(
            id="anom_vendor_variant",
            amount=-500.0,
            status="exception",
            human_action="approve_match",
            candidates=[
                Evidence(source="bank", doc_id="bank_acme_500", field="merchant", value="ACME CONSULTING LLC"),
                Evidence(source="invoice", doc_id="inv_acme_500", field="merchant", value="ACME LLC"),
                Evidence(source="bank", doc_id="bank_acme_500", field="amount", value="-500.0"),
                Evidence(source="invoice", doc_id="inv_acme_500", field="amount", value="500.0"),
            ],
            confidence=0.80,
        ),
        # --- 5. FX-ROUND (EUR invoice vs USD bank settlement variance) ---
        ReconItem(
            id="anom_fx_round",
            amount=-447.83,
            status="exception",
            human_action="approve_match",
            candidates=[
                Evidence(source="bank", doc_id="bank_usd_447", field="merchant", value="Cloud Services SAS"),
                Evidence(source="invoice", doc_id="inv_eur_410", field="merchant", value="Cloud Services SAS"),
                Evidence(source="invoice", doc_id="inv_eur_410", field="fx_note", value="FX converted at 1.0923 with rounding diff"),
            ],
            confidence=0.80,
        ),
        # --- 6. ORPHAN-INVOICE (Unpaid customer invoice) ---
        ReconItem(
            id="anom_orphan_invoice",
            amount=890.0,
            status="exception",
            human_action="contact_vendor",
            candidates=[
                Evidence(source="invoice", doc_id="inv_orphan_1042", field="amount", value="890.0"),
                Evidence(source="invoice", doc_id="inv_orphan_1042", field="ref", value="INV-1042"),
                Evidence(source="invoice", doc_id="inv_orphan_1042", field="merchant", value="Global Logistics Corp"),
            ],
            confidence=0.0,
        ),
        # --- 7. PERSONAL (Owner coffee purchase on corporate card) ---
        ReconItem(
            id="anom_personal_coffee",
            amount=-18.50,
            status="exception",
            human_action="write_off",
            candidates=[
                Evidence(source="bank", doc_id="bank_coffee_18", field="amount", value="-18.5"),
                Evidence(source="bank", doc_id="bank_coffee_18", field="memo", value="Morning coffee - Business card ending 4402"),
                Evidence(source="bank", doc_id="bank_coffee_18", field="merchant", value="Blue Bottle Coffee"),
            ],
            confidence=0.0,
        ),
        # --- 8. REFUND-SPLIT (Stripe net payout = gross minus customer refund) ---
        ReconItem(
            id="anom_refund_split",
            amount=1200.0,
            status="exception",
            human_action="approve_match",
            candidates=[
                Evidence(source="bank", doc_id="bank_split_1200", field="amount", value="1200.0"),
                Evidence(source="stripe", doc_id="str_gross_1500", field="payout", value="1500.0"),
                Evidence(source="stripe", doc_id="str_refund_300", field="refund", value="-300.0"),
            ],
            confidence=0.85,
        ),
        # --- 9. MATCHED CONTROL 1 (Clean exact invoice match) ---
        ReconItem(
            id="ctrl_matched_saas",
            amount=-2400.0,
            status="matched",
            human_action="approve_match",
            candidates=[
                Evidence(source="bank", doc_id="bank_saas_2400", field="amount", value="-2400.0"),
                Evidence(source="invoice", doc_id="inv_saas_2400", field="amount", value="2400.0"),
                Evidence(source="invoice", doc_id="inv_saas_2400", field="ref", value="INV-SAAS-100"),
            ],
            confidence=0.98,
            explanation="Exact reference and amount match for monthly enterprise SaaS subscription.",
        ),
        # --- 10. MATCHED CONTROL 2 (Clean exact consulting fee match) ---
        ReconItem(
            id="ctrl_matched_consulting",
            amount=-5000.0,
            status="matched",
            human_action="approve_match",
            candidates=[
                Evidence(source="bank", doc_id="bank_consult_5000", field="amount", value="-5000.0"),
                Evidence(source="invoice", doc_id="inv_consult_5000", field="amount", value="5000.0"),
                Evidence(source="invoice", doc_id="inv_consult_5000", field="ref", value="INV-CNS-200"),
            ],
            confidence=0.95,
            explanation="Exact match between wire transfer and consulting retainer invoice.",
        ),
    ]


class TestExplanationAndEnrichment(unittest.TestCase):
    def setUp(self):
        self.items = build_10_eval_cases()

    def test_explanation_generation_and_citation_integrity(self):
        """
        Tests that all 8 exceptions get non-null explanations, valid confidences,
        allowed actions, and ZERO invented doc_ids.
        """
        explained = explain_exceptions(self.items)
        self.assertEqual(len(explained), 10)

        exception_count = 0
        matched_count = 0

        for item in explained:
            provided_doc_ids = {c.doc_id for c in item.candidates if c.doc_id}

            if item.status == "exception":
                exception_count += 1
                # 1. Non-null explanation
                self.assertIsNotNone(item.explanation, f"Item {item.id} has null explanation")
                self.assertTrue(len(item.explanation.strip()) > 0, f"Item {item.id} has empty explanation")
                self.assertNotIn("waiting for ai", item.explanation.lower())

                # 2. Confidence within [0.0, 1.0]
                self.assertGreaterEqual(item.confidence, 0.0, f"Confidence < 0 for {item.id}")
                self.assertLessEqual(item.confidence, 1.0, f"Confidence > 1 for {item.id}")

                # 3. Recommended action within 5-value enum
                self.assertIn(
                    item.human_action,
                    ALLOWED_ACTIONS,
                    f"Invalid action '{item.human_action}' for {item.id}. Allowed: {ALLOWED_ACTIONS}"
                )

                # 4. Citation integrity: EVERY citation is a provided doc_id or real URL
                for cit in item.citations:
                    is_doc_id = cit in provided_doc_ids
                    is_url = cit.startswith("http://") or cit.startswith("https://")
                    self.assertTrue(
                        is_doc_id or is_url,
                        f"Invented citation '{cit}' found in item {item.id}! Allowed doc_ids: {provided_doc_ids}"
                    )
            else:
                matched_count += 1
                self.assertEqual(item.status, "matched")

        self.assertEqual(exception_count, 8)
        self.assertEqual(matched_count, 2)

    def test_enrichment_templates(self):
        """
        Verifies query templates per Contract specification for each human_action.
        """
        self.assertEqual(
            get_enrichment_query("Chase", "write_off"),
            "Chase official fee schedule"
        )
        self.assertEqual(
            get_enrichment_query("OfficeDepot", "request_receipt"),
            "OfficeDepot receipt portal"
        )
        self.assertEqual(
            get_enrichment_query("Global Logistics", "contact_vendor"),
            "Global Logistics official contact / invoice portal"
        )
        self.assertEqual(
            get_enrichment_query("Acme Corp", "escalate_accountant"),
            "Acme Corp business registration"
        )

    def test_simulated_tavily_timeout(self):
        """
        On simulated Tavily timeout:
          - citations == []
          - explanation contains 'External verification unavailable'
          - no fallback domain synthesis
        """
        item = ReconItem(
            id="test_timeout_exc",
            amount=-147.0,
            status="exception",
            human_action="write_off",
            candidates=[
                Evidence(source="bank", doc_id="bank_fee_147", field="merchant", value="Chase"),
                Evidence(source="bank", doc_id="bank_fee_147", field="memo", value="Analysis fee"),
            ],
            explanation="Monthly commercial bank analysis fee debit.",
            citations=["bank_fee_147"],
        )

        with patch("core.enrich.search_tavily", side_effect=TimeoutError("Connection timed out")):
            enriched = enrich_exception(item)

            # Assert citations is empty list on timeout
            self.assertEqual(enriched.citations, [], "Citations must be [] on Tavily timeout/error")

            # Assert explanation contains the required sentence
            self.assertIn(
                "External verification unavailable",
                enriched.explanation,
                "Explanation must state that external verification is unavailable"
            )

            # Assert no synthesized URLs in citations
            for c in enriched.citations:
                self.assertNotIn("example.com", c)
                self.assertNotIn("stripe.com", c)

    def test_simulated_tavily_success(self):
        """
        When Tavily returns URLs, only authentic URLs and provided doc_ids are in citations.
        """
        item = ReconItem(
            id="test_success_exc",
            amount=-147.0,
            status="exception",
            human_action="write_off",
            candidates=[
                Evidence(source="bank", doc_id="bank_fee_147", field="merchant", value="JPMorgan Chase"),
            ],
            explanation="Standard bank service fee.",
            citations=["bank_fee_147"],
        )

        sample_url = "https://example.com/commercial-banking/fees"
        with patch("core.enrich.search_tavily", return_value=[sample_url]), \
             patch("core.enrich.verify_citations", return_value=[sample_url]):
            enriched = enrich_exception(item)

            self.assertIn(sample_url, enriched.citations)
            self.assertIn("bank_fee_147", enriched.citations)
            self.assertNotIn("External verification unavailable", enriched.explanation)


if __name__ == "__main__":
    unittest.main()
