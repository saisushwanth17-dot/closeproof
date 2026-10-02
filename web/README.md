# CloseProof Web Frontend (CP-4)

The accountant-grade forensic accounting workstation for **CloseProof** (Autonomous Month-End Close Agent, Track 2: Nebius x NVIDIA AI Hackathon).

> **Core Tenet:** *CloseProof produces proof, not silent ledger changes.*

---

## Architectural Highlights

- **Dual-Store Architecture:**
  - **Store 1 (View-Only Ring Buffer):** Capped at 500 events for high-volume stream rendering without DOM bloat.
  - **Store 2 (Cumulative State):** Reducer processes all events, compiling cumulative match rates, exception queues, evidence graphs, and close packet readiness.
- **Authoritative Item Linkage:** Exception drawers and timelines bind only to telemetry events with explicit, recognized item identifiers. Linkage is never inferred from timestamps, sequence order, proximity, or matching amounts.
- **Code-Driven Arithmetic:** Accounting calculations and reconciliation math are code-driven. LLMs do not compute financial totals.
- **Model Hierarchy:**
  - **Nemotron Nano:** Fast extraction and normalization tasks (merchant normalization, receipt field extraction, and classification).
  - **Nemotron Ultra:** Multi-document correlation, policy evaluation, and exception root-cause reasoning.
  - **Tavily Search API:** Live external vendor identity and business registry verification with citations.
- **Semantic Theme System:** Light, Dark, and System modes using semantic CSS tokens (`:root` and `.dark`), scoped theme transitions (no global wildcard transitions), and anti-flash hydration script.

---

## Workspace Structure

```
web/
├── app/                  # Next.js App Router (page, replay, privacy, terms, layout)
├── components/
│   ├── closeroom/        # Workstation layout, ProcessingPipeline, SourceStatusStrip
│   ├── common/           # MatchRateRing, Badge, SafeLink, WhyNemotron
│   ├── drawer/           # EvidenceDrawer, InvestigationTimeline
│   ├── intake/           # DataIntake, SourceUploadCard
│   ├── layout/           # CloseRoomHeader, Footer
│   ├── packet/           # PacketPreview
│   ├── queue/            # ExceptionQueue
│   ├── replay/           # ReplayControls
│   ├── telemetry/        # TelemetryFeed, EventRow
│   └── theme/            # ThemeProvider, ThemeToggle
├── hooks/                # useTelemetry
├── lib/
│   ├── adapter/          # ingestion, telemetrySource, webSocketSource, replayScheduler
│   ├── api/              # config (centralized endpoints)
│   ├── contracts/        # contractB, contractC, explanation, guards
│   ├── store/            # types, reducer, selectors, eventBuffer
│   ├── constants.ts
│   └── formatters.ts
└── public/replay/        # closeproof-demo.jsonl, closeproof-demo.meta.json, packet.sample.md
```

---

## Development & Verification Scripts

All commands run with Node 20 (`.nvmrc` pinned):

```bash
# Install dependencies
npm install

# Run development workstation
npm run dev

# Run Vitest test suite
npm test

# Run TypeScript typecheck
npm run typecheck

# Run Next.js linter
npm run lint

# Production build
npm run build
```

---

## Frozen Contracts

- **Contract B (`lib/contracts/contractB.ts`):** `ReconItem`, `Evidence`, `HumanAction` (`approve_match`, `request_receipt`, `contact_vendor`, `write_off`, `escalate_accountant`).
- **Contract C (`lib/contracts/contractC.ts`):** Telemetry envelope `{ project: 'closeproof', event, severity, ts, payload }`.
