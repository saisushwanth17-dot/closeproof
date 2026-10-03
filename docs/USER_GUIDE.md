# CloseProof — The Complete Guide
*For new users, new teammates, and anyone who wants to understand the product in 10 minutes.*
*Version 1.0 · Built for the Nebius x NVIDIA Global AI Hackathon (Track 2: Best Apps & Agents)*

---

## 1. CloseProof in One Paragraph

CloseProof is an **autonomous month-end close agent**. You give it the messy financial records a small business already has — bank CSV exports, Stripe payout reports, invoices, and photographed receipts — and it matches every transaction against every other record. Every dollar either **matches with evidence** or becomes an **exception with a written, cited explanation** and a recommended human action. At the end it produces an **accountant-ready Close Packet**. CloseProof never edits your ledger and never pretends to be sure: it produces **proof, not ledger edits**.

**The analogy:** think of it as a forensic accountant who never sleeps, shows their work for every single number, and hands you a report — but only *you* are allowed to decide what happens next.

---

## 2. The Problem We Are Solving

Small business owners and bookkeepers lose evenings and weekends to month-end close. Real words from real people:

> *"I wasted 10 hours last Saturday on month-end close."* — r/smallbusiness (duplicate Stripe imports + an unexplained $147 mismatch)
> *"Bookkeeping means copying transactions from my bank, hunting down receipts in my email, matching invoices to payments."* — r/smallbusiness

Existing tools (QuickBooks, Ramp) automate the easy parts but **hide uncertainty**: when something doesn't reconcile, the human still has to discover *why*, alone, at midnight. CloseProof flips this: the agent does the detective work and **proves** its conclusions with evidence and citations.

---

## 3. Our Three Laws (non-negotiable)

1. **Proof, not ledger edits.** CloseProof never silently changes your books. Every action requires a human click.
2. **Every claim carries evidence.** Every explanation cites real document IDs or real Tavily search URLs. If verification is unavailable, the system says so honestly instead of inventing a source.
3. **Humans decide, AI recommends.** The AI proposes an action; only a person approves it.

---

## 4. How It Works (the pipeline in plain words)

| Stage | What happens | Who does it |
|---|---|---|
| 1. Intake & Validation | Your 4 feeds are uploaded, schema-checked, de-duplicated | Backend ingester |
| 2. Parsing & OCR | Receipt images/PDFs become text; fields extracted; merchant names normalized ("ACME CONSULTING LLC" ≈ "ACME LLC") | Nebius Serverless Job + Tesseract, then **Nemotron-3-Nano (30B-A3B)** |
| 3. Deterministic Reconciliation | Staged matching: exact refs → amount+date+merchant similarity → split matches (payout − refund). Pure code math — **LLMs never compute totals** | Matching engine |
| 4. Investigation | Unmatched items get forensic explanations, external verification with citations | **Nemotron-3-Ultra (550B-A55B)** + **Tavily Search** |
| 5. Human Action | You review each exception and approve an action | You |
| 6. Close Packet | An accountant-ready Markdown/PDF report with every exception, citation, and confidence score | Packet compiler |

**Side rail:** every stage emits a live telemetry event (like `recon_match`, `explain_done`, `packet_ready`) that streams into the dashboard so you can watch the agent think.

**Who is who:** Nano = the fast clerk (extraction, normalization). Ultra = the detective-writer (root-cause explanations). The matching engine = the calculator (deterministic math). Tavily = the librarian (external facts, always with a source link).

---

## 5. New User Walkthrough — the Website, Section by Section

**Step 0 — Open the site.** You land on the hero: *"The month-end close that proves itself."* The top nav jumps to any section: Overview, Close Room, Pipeline, Telemetry, Exceptions, Packet, Architecture.

**Step 1 — Start a run.** Click **"Run Month-End Close"** (triggers a live reconciliation) or **"Inspect Close Room"** (scrolls to the workspace). Trust chips below show the stack: NVIDIA Nemotron · Nebius Token Factory · Tavily · "Proof, not ledger edits".

**Step 2 — Read the Close Room header.**
- **Stepper** (Data Intake → Reconciliation → Exception Review → Close Packet): where the run is right now.
- **Banner:** repeats the product law + counts open exceptions + shows the Run ID (click the copy icon) + a warnings badge.
- **Stats:** Match Rate ring (e.g., 67% = 16 of 24 transactions matched), Unreconciled Total ($ at risk), Elapsed time.
- **Stage chips 1–7:** the run's progress; the active stage is highlighted.

**Step 3 — Check Staged Sources.** The four files being processed (bank CSV, Stripe payouts, invoices, receipts). In demo mode these are synthetic sample files.

**Step 4 — Watch the Pipeline cards.** Five cards (Intake, Nano, Recon, Ultra, Packet) each flip to **"Verified"** as their stage completes. Click a card to read why that stage exists.

**Step 5 — Watch the Telemetry Stream.** A live table of events with severity badges (info/warn). Use **Replay** to re-play a recorded run at 0.5x–4x speed, or **Live WebSocket** for real-time. If you see a **"Polling…"** badge, the WebSocket couldn't connect and the UI safely fell back to polling — everything still works.

**Step 6 — Review Exceptions.** The table lists every unmatched dollar: ID, amount, description, confidence, **Required Action** (the AI's recommendation), Status. **Click any row** to open the **Evidence Drawer**.

**Step 7 — Use the Evidence Drawer (the heart of the product).**
- **Explanation:** the Ultra-written forensic reason, in plain English.
- **Evidence:** every document supporting the candidates (source, doc ID, field = value).
- **Citations:** clickable external links from Tavily verification.
- **Actions:** five buttons; the recommended one is highlighted. Click one → the row's status flips from *Pending* to approved, a toast confirms "Action Recorded", and the event appears in the telemetry stream.

**Step 8 — Export the Close Packet.** At the bottom: the full accountant-ready report. **Copy Markdown**, **Print / Save as PDF**, or **Download Sample .MD**. The banner above it must read **green** ("Packet totals verified against run ledger") — that means the report's totals mathematically match the live run. Amber means a mismatch (report it as a bug).

**Step 9 — Read the Architecture section.** "Why Nemotron? Code-Driven Math vs Neural Reasoning" explains the tiering in four cards. Great for curious users and judges.

**Step 10 — Demo Mode.** Add `?demo=1` to the URL: dark theme, replay auto-loads, dev badges hidden. This is the mode used for recordings and presentations.

---

## 6. The Five Human Actions (what each button means)

| Action | Meaning | Example from demo data |
|---|---|---|
| `approve_match` | "Yes, these records are the same money." | Stripe payout = gross − refund split |
| `request_receipt` | "Real expense, but the receipt is missing — go get it." | $320 OfficeDepot charge |
| `contact_vendor` | "Our records disagree with the vendor's — ask them." | Unpaid invoice #1042 |
| `write_off` | "Legitimate cost with no invoice (fees, owner draws)." | The $147 bank service fee |
| `escalate_accountant` | "Beyond our pay grade — a professional must decide." | Complex multi-source disputes |

---

## 7. What You Will See in the Demo Data (the 8 planted anomalies)

The sample run intentionally contains these 8 problems so you can watch CloseProof catch each one:

| Anomaly | What it is | Expected action |
|---|---|---|
| DUP-STRIPE | Same Stripe payout imported twice | approve_match (void duplicate) |
| FEE-147 | $147 bank fee with no invoice ⭐ *the demo star* | write_off |
| MISSING-RECEIPT | $320 expense, no receipt | request_receipt |
| VENDOR-VARIANT | "ACME LLC" vs "ACME CONSULTING LLC" | approve_match |
| FX-ROUND | €410 invoice vs $447.83 bank (FX rounding) | approve_match |
| ORPHAN-INVOICE | Invoice never paid in tracked accounts | contact_vendor |
| PERSONAL | Owner's coffee on the business card | write_off |
| REFUND-SPLIT | Payout $1,200 = $1,500 − $300 refund | approve_match |

---

## 8. Glossary (30-second definitions)

- **Run:** one full reconciliation pass; has a unique Run ID.
- **Evidence:** a specific field from a specific document supporting a match.
- **Citation:** a real external URL from Tavily, or a real doc ID. Never invented.
- **Confidence:** 0–1 score for how sure the match/explanation is.
- **Exception:** an unmatched dollar requiring a human decision.
- **Telemetry event:** one line of the agent's live work log.
- **Close Packet:** the final exportable report.
- **Replay mode:** re-playing a recorded run; **Live mode:** real-time.

---

## 9. FAQ & Troubleshooting

- **"Polling…" badge?** WebSocket unavailable; UI auto-fell back to polling. Normal, safe.
- **Explanation ends with "External verification unavailable at run time."?** Tavily timed out. The system honestly shows zero citations instead of faking one. This is a feature.
- **Same numbers every run?** Demo data is synthetic and fixed on purpose (reproducible demos + tests).
- **Amber packet banner?** Totals mismatch = bug. Report immediately; it must be green for demos.
- **Can I upload my real bank data?** Not in the MVP — all data is synthetic by design (privacy). Real uploads are on the roadmap.

---

## 10. For New Teammates — Developer Onboarding

**Repo map:** `core/` (engine: reconcile, explain, enrich, packet, sandbox, jobs) · `api/` (FastAPI backend) · `web/` (Next.js frontend) · `eval/` (tests + harness) · `fixtures/` (synthetic data + truth table) · `demo/` (video script, bench numbers) · `docs/` (this guide).

**Run locally:**
```cmd
:: Backend (terminal 1)
cd closeproof
".venv\Scripts\python.exe" -m uvicorn api.main:app --reload
:: Frontend (terminal 2)
cd closeproof\web
npm install   (first time only)
npm run dev
```
Set `NEBIUS_MOCK=1` to develop without live API keys.

**Golden rules for contributors:**
1. The UI never hardcodes explanations or actions — it renders only what the API returns.
2. Citations are real or they don't exist.
3. Telemetry events must match Contract C v0.2 (`feed_ingested, recon_match, recon_exception, evidence_attached, tavily_lookup, explain_done, sandbox_result, packet_ready, action_applied`).
4. `pytest eval/` must be green before pushing; CI enforces it.
5. Commit messages use role prefixes: `cp-1:`, `cp-2:`, … `cp-5:`.

**Roles:** CP-1 engine/packet/API (Varma) · CP-2 explain/enrich prompts · CP-3 sandbox/OCR infra · CP-4 frontend/demo · CP-5 fixtures/eval/CI.

---

## 11. Demo-Day Cheat Sheet
Use `?demo=1`, dark theme, and follow `demo/script.md`: hook quote → ingest → the $147 drawer moment with citations → human approval → packet export → repo + stack close. Three minutes, no live risks.
