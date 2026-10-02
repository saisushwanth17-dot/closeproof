import unittest
from fastapi.testclient import TestClient
from api.main import app


class TestAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_root_endpoint(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "CloseProof API is live. Built on Nebius & NVIDIA.")

    def test_start_reconciliation_endpoint(self):
        response = self.client.post("/api/runs")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("run_id", data)
        self.assertEqual(data["status"], "completed")
        self.assertIn("items", data)

        items = data["items"]
        self.assertEqual(len(items), 8)  # 3 matched + 5 exceptions = 8 ReconItems

        # Check anomalies in items
        statuses = {item["status"] for item in items}
        self.assertIn("matched", statuses)
        self.assertIn("exception", statuses)

        actions = {item["human_action"] for item in items}
        self.assertIn("approve_match", actions)
        self.assertIn("write_off", actions)
        self.assertIn("request_receipt", actions)
        self.assertIn("contact_vendor", actions)

        run_id = data["run_id"]

        # Test GET /api/runs/{run_id}
        get_resp = self.client.get(f"/api/runs/{run_id}")
        self.assertEqual(get_resp.status_code, 200)
        self.assertEqual(get_resp.json()["run_id"], run_id)

        # Test GET /api/runs/{run_id}/packet.md
        packet_resp = self.client.get(f"/api/runs/{run_id}/packet.md")
        self.assertEqual(packet_resp.status_code, 200)
        self.assertIn("text/markdown", packet_resp.headers["content-type"])
        self.assertIn("# Month-End Close Packet", packet_resp.text)
        self.assertIn("Exceptions Requiring Human Action", packet_resp.text)
        self.assertIn("Matched Transactions", packet_resp.text)


if __name__ == "__main__":
    unittest.main()
