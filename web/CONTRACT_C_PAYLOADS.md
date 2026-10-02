# Contract C: Telemetry Payload Specification (Proposal v0.1.0)

**Owner:** CP-4 (Frontend Schema Owner)  
**Status:** Proposal pending squad vote (G2 deadline: Oct 5)  
**Emitters:** CP-1 (Reconciliation Core), CP-2 (Nemotron Agent), CP-3 (Tavily/Tools), CP-5 (Harness)  
**Consumer:** CP-4 (CloseRoom Frontend)

---

## 1. Envelope Specification

Every telemetry emission MUST be a single-line JSON object adhering to Contract C:

```json
{
  "project": "closeproof",
  "event": "<TelemetryEventName>",
  "severity": "info" | "warn" | "error",
  "ts": 1727870400000,
  "payload": { ... }
}
```

### Top-Level Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `project` | `"closeproof"` | Fixed literal identifier. |
| `event` | `string` | One of the 8 allowed event names in `ALLOWED_EVENTS`. |
| `severity` | `"info" \| "warn" \| "error"` | Telemetry severity level. |
| `ts` | `number` | Unix epoch timestamp. Recommended: milliseconds (`>= 1e11`). Normalized automatically. |
| `payload` | `Record<string, unknown>` | Event-specific payload object. |

---

## 2. Event Payloads

### `feed_ingested`
Emitted when bank feeds, invoices, or transactions are ingested.
- `run_id` (string, required): ULID or unique identifier for the run.
- `source` (string, required): e.g., `"bank"`, `"stripe"`, `"quickbooks"`.
- `count` (number, required): Integer count of ingested records.
- `total_cents` (number, optional): Total transaction volume in cents.

### `recon_match`
Emitted when an item is fully reconciled against candidates.
- Payload MUST be a full `ReconItem` (Contract B):
  - `id` (string, required): Item identifier.
  - `amount` (number, required): Signed dollar amount (e.g., `450.00`).
  - `status` (`"matched"`, required).
  - `candidates` (`Evidence[]`, required): Array of supporting evidence.
  - `confidence` (number, required): Number in range `[0.0, 1.0]`.
  - `explanation` (string \| null): Summary explanation.
  - `citations` (string[]): List of source citation references or URLs.
  - `human_action` (null, required): Always `null` for matched items.

### `recon_exception`
Emitted when an item cannot be automatically matched.
- Payload MUST be a full `ReconItem` (Contract B):
  - `id` (string, required): Item identifier.
  - `amount` (number, required): Signed dollar amount (e.g., `-147.00`).
  - `status` (`"exception"`, required).
  - `candidates` (`Evidence[]`, required): Candidate matches if any.
  - `confidence` (number, required): Number in range `[0.0, 1.0]`.
  - `explanation` (string \| null): Explanation summary.
  - `citations` (string[]): Citation links or document IDs.
  - `human_action` (`HumanAction`, required): One of:
    - `"approve_match"`
    - `"request_receipt"`
    - `"contact_vendor"`
    - `"write_off"`
    - `"escalate_accountant"`

### `evidence_attached`
Emitted when investigative tooling attaches new candidate evidence.
- `item_id` (string, required): Target item ID.
- `evidence` (`Evidence`, required):
  - `source` (string, required)
  - `doc_id` (string, required)
  - `field` (string, required)
  - `value` (string, required)
  - `url` (string \| null)

### `tavily_lookup`
Emitted when external web lookups are executed.
- `query` (string, required): Exact search query.
- `urls` (string[], required): URLs returned by search.
- `item_id` (string \| null, optional): Linked item if item-specific.

### `explain_done`
Emitted when LLM analysis completes for an exception.
- `item_id` (string, required): Target item ID.
- `model_tier` (`"ultra" \| "nano"`, required): Model tier used.
- `explanation` (string, required): Forensic rationale.
- `missing_evidence` (string[], required): Missing documentation checklist.
- `candidate_scores` (CandidateScore[], required): Scoring breakdown.
- `recommended_action` (`HumanAction`, required).
- `confidence` (number, required): Confidence score in `[0.0, 1.0]`.
- `citations` (string[], required).
- `tokens` (number, optional): Token count.
- `latency_ms` (number, optional): Processing latency in ms.

### `sandbox_result`
Emitted when code execution or analysis completes in a Nebius Sandbox or Docker container.
- `item_id` (string \| null, optional)
- `runtime` (string, required): e.g., `"nebius-sandbox"` or `"docker-fallback"`.
- `exit_code` (number, required): Exit code.
- `stdout` (string, optional)
- `stderr` (string, optional)

### `packet_ready`
Emitted when the close packet is finalized and ready for accountant review.
- `run_id` (string, required)
- `summary` (object, required):
  - `matched_count` (number, required)
  - `exception_count` (number, required)
  - `total_unreconciled_cents` (number, required): Gross absolute sum in cents.
- `packet_path` (string, optional): Server path to generated packet markdown.
- `pdf_path` (string, optional): Server path to generated PDF report.

---

## 3. Authority and Precedence Rule

Per Contract B and Product Law 4:
- The `ReconItem` payload on `recon_exception` is **authoritative** for `human_action` and `confidence`.
- The `explain_done` payload provides secondary analysis. If `recommended_action` or `confidence` differ between `ReconItem` and `explain_done`, both are rendered with a conflict badge highlighting the discrepancy.
