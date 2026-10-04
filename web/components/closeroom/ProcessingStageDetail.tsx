'use client';

import React from 'react';

export interface StageInfo {
  id: string;
  name: string;
  engine: string;
  summary: string;
  detail: string;
  boundary: string;
}

export const STAGE_INFOS: StageInfo[] = [
  {
    id: 'intake',
    name: 'Data Intake & Validation',
    engine: 'Source Ingestion + Verification',
    summary: 'Staged CSV bank feeds, Stripe settlement payouts, invoices, and expense receipts.',
    detail: 'Client-side boundary validates file integrity and format compatibility. Ingestion streams records to the agent activity feed.',
    boundary: 'Files staged and verified; backend logs source ingestion activity.',
  },
  {
    id: 'nano',
    name: 'Document Parsing & OCR',
    engine: 'Smart Extraction + Tesseract OCR',
    summary: 'Fast extraction and normalization tasks (merchant normalization, receipt field extraction, and classification).',
    detail: 'Receipt images are parsed through OCR and normalized into structured JSON with vendor name, line items, and transaction metadata.',
    boundary: 'Autonomous model execution; results feed deterministic reconciliation graph.',
  },
  {
    id: 'recon',
    name: 'Deterministic Reconciliation',
    engine: 'Code-Driven Matching Engine',
    summary: 'Accounting calculations and reconciliation math are code-driven. LLMs do not compute financial totals.',
    detail: 'Matches bank transactions to payout batches and invoices using deterministic arithmetic (date windows, amount equality, reference matching). Zero generative arithmetic in financial totals.',
    boundary: 'ReconItem state matching. Emits matched and exception records.',
  },
  {
    id: 'ultra',
    name: 'Exception Investigation',
    engine: 'Forensic Reasoning + Web Verification',
    summary: 'Multi-document forensic reasoning and external vendor lookups for flagged exceptions.',
    detail: 'For flagged anomalies, external search performs live merchant verification, while deep forensic reasoning correlates unstructured text, receipts, and policies to formulate recommended human actions.',
    boundary: 'Emits candidate evidence, external verification, and forensic explanation with citations.',
  },
  {
    id: 'packet',
    name: 'Accountant-Ready Close Packet',
    engine: 'Deterministic Compilation + Markdown Export',
    summary: 'Accountant-ready close packet with complete audit trail, citations, and human approval log.',
    detail: 'Produces an immutable close packet with mathematical match totals, human exception decisions, confidence metrics, and complete provenance documentation.',
    boundary: 'Generates close packet; renders interactive preview and export.',
  },
];

interface ProcessingStageDetailProps {
  selectedStageId: string | null;
  onClose: () => void;
}

export function ProcessingStageDetail({
  selectedStageId,
  onClose,
}: ProcessingStageDetailProps) {
  if (!selectedStageId) return null;
  const stage = STAGE_INFOS.find((s) => s.id === selectedStageId);
  if (!stage) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="stage-detail-title"
      className="p-4 rounded border border-border bg-surface shadow-sm mt-3 animate-in fade-in duration-150"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-brand font-semibold">
            Architectural Stage Rationale
          </span>
          <h4 id="stage-detail-title" className="text-sm font-bold text-foreground">
            {stage.name}
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-foreground-muted hover:text-foreground p-1 rounded"
          aria-label="Close stage details"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <span className="font-medium text-foreground-muted">Engine: </span>
          <span className="font-mono text-foreground font-semibold">{stage.engine}</span>
        </div>
        <p className="text-foreground-muted leading-relaxed">{stage.summary}</p>
        <p className="text-foreground-subtle leading-relaxed">{stage.detail}</p>
        <div className="p-2 rounded bg-surface-subtle border border-border text-[11px] text-foreground-muted font-mono">
          <span className="font-semibold text-foreground">Provenance Boundary: </span>
          {stage.boundary}
        </div>
      </div>
    </div>
  );
}
