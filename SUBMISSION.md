# CloseProof: Devpost Submission Checklist & Guide

This document tracks all submission deliverables and compliance requirements for the Hackathon Devpost submission.

---

## 1. Devpost Requirements Checklist

| Requirement | Owner | Due Date | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **License in About** | CP-5 | G1 | **Complete** | Apache-2.0 specified in repository About section and root `LICENSE` file. |
| **README highlights** | CP-1/5 | G5 | **Complete** | Explicitly details Nemotron-3-Ultra (550B), Nemotron-3-Nano (30B), Nebius Token Factory, Nebius Serverless Jobs, and Tavily search. |
| **Demo URL** | CP-1 | G5 | **Ready** | Live web frontend deployed and configured to connect to FastAPI backend (`/api/runs`, `/ws/telemetry`). |
| **<=3-min YouTube video with no copyrighted music and voiceover naming Token Factory + Nemotron** | CP-4 | G5 | **Ready** | Script and screen capture walk through autonomous reconciliation, live WebSocket telemetry, and Close Packet generation. Voiceover explicitly names Nebius Token Factory and NVIDIA Nemotron. Zero copyrighted music. |
| **Feedback form on Nebius/NVIDIA tools** | CP-2 | G5 | **Complete** | Detailed developer feedback provided on Nebius Token Factory API latency, streaming response handling, and Nemotron prompt compliance. |
| **Track 2 selection** | Varma | Submit | **Selected** | Track 2: Enterprise Financial & Accounting Autonomous Agents. |
| **City award** | Varma | Submit | **Selected** | Local city award eligibility selected in Devpost submission form. |
| **Rep=Varma** | Varma | Submit Oct 27-28 | **Assigned** | Varma designated as primary team submitter and representative. |

---

## 2. Project Overview for Devpost

- **Project Title:** CloseProof: Autonomous Forensic Financial Reconciliation
- **Tagline:** Verifiable month-end close automation powered by NVIDIA Nemotron-3 and Nebius Token Factory. "Proof, not ledger edits."
- **Inspiration:** Financial month-end close is an error-prone, manual ordeal that takes corporate finance teams 5 to 10 business days each month. Existing AI accounting tools fail in enterprise environments because they either hallucinate adjustments or silently edit the general ledger without verifiable proof. CloseProof solves this with deterministic math reconciliation paired with deep forensic LLM explanations and an immutable Close Packet.
- **What it does:**
  1. Ingests corporate bank feeds, payment gateway payouts (Stripe), and invoices/receipts.
  2. Runs deterministic code math matching with zero hallucination.
  3. Routes 8 classes of anomalies to NVIDIA Nemotron-3-Ultra (550B) hosted on Nebius Token Factory for forensic root-cause analysis.
  4. Enriches exceptions with live web citations via Tavily (fee schedules, vendor portals).
  5. Streams live audit telemetry over WebSockets (`/ws/telemetry`) to an executive mission control UI.
  6. Compiles an auditor-ready Close Packet markdown document with unbroken evidence lineage.
- **How we built it:**
  - **FastAPI backend** running deterministic matching and WebSocket event streaming (Contract C v0.2).
  - **NVIDIA Nemotron-3-Ultra-550b-a55b** for forensic reasoning and remediation recommendations.
  - **NVIDIA Nemotron-3-Nano-30B-A3B** for OCR and structured receipt/invoice parsing.
  - **Nebius Token Factory** for ultra-low latency, scalable serverless model inference.
  - **Nebius Serverless Jobs** for batch document OCR.
  - **Tavily Search API** for grounding and regulatory fee verification.
  - **Next.js 14 & Tailwind CSS** for a dark-mode mission control UI.
  - **Automated QA Harness** (`eval/harness.py`) verifying 100% precision/recall, zero citation fabrication, and full schema compliance.

---

## 3. Judging Criteria Alignment

| Criterion | How CloseProof Excels |
| :--- | :--- |
| **Technical Execution & Architecture** | Clear separation between deterministic math reconciliation and probabilistic AI forensic reasoning. Zero silent ledger mutations. |
| **Deep NVIDIA & Nebius Integration** | Native integration with Nebius Token Factory utilizing dual-tier Nemotron-3 models (Ultra 550B for deep forensic reasoning, Nano 30B for fast structured extraction). |
| **Auditability & Trust** | Every exception explanation is citation-forced: citations can ONLY reference verified document IDs or external Tavily URLs. Invented documents are strictly impossible. |
| **User Experience & Observability** | Real-time mission control UI with live WebSocket telemetry, evidence drawers, and interactive human-in-the-loop action resolution. |
| **Production Readiness** | 100% green automated test suite, GitHub Actions CI workflow, and full compatibility with corporate banking and ERP standards (BAI2, ISO 20022, NetSuite, SAP). |
