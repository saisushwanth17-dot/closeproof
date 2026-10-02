'use client';

import React from 'react';

export function WhyNemotron({ className = '' }: { className?: string }) {
  return (
    <div
      role="region"
      aria-label="Model Architecture Rationale"
      className={`rounded border border-border bg-surface p-4 text-xs ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-brand/10 text-brand font-semibold uppercase">
          Architecture
        </span>
        <h3 className="font-bold text-foreground text-sm">
          Why Nemotron? Code-Driven Math vs Neural Reasoning
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-foreground-muted">
        {/* Deterministic Reconciliation */}
        <div className="p-3 rounded border border-border bg-surface-subtle">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-matched" />
            <span className="font-semibold text-foreground">Deterministic Math Engine</span>
          </div>
          <p className="leading-relaxed">
            Accounting calculations and reconciliation math are code-driven. LLMs do not compute financial totals.
          </p>
        </div>

        {/* Nemotron Nano */}
        <div className="p-3 rounded border border-border bg-surface-subtle">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-brand" />
            <span className="font-semibold text-foreground">Nemotron Nano</span>
          </div>
          <p className="leading-relaxed">
            Nemotron Nano: Fast extraction and normalization tasks (merchant normalization, receipt field extraction, and classification).
          </p>
        </div>

        {/* Nemotron Ultra */}
        <div className="p-3 rounded border border-border bg-surface-subtle">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="font-semibold text-foreground">Nemotron Ultra</span>
          </div>
          <p className="leading-relaxed">
            Nemotron Ultra: Multi-document correlation, policy evaluation, and exception root-cause reasoning.
          </p>
        </div>

        {/* Tavily Vendor Search */}
        <div className="p-3 rounded border border-border bg-surface-subtle">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-info" />
            <span className="font-semibold text-foreground">Tavily Search</span>
          </div>
          <p className="leading-relaxed">
            Tavily Search: Live vendor identity and business registry verification with source citations.
          </p>
        </div>
      </div>
    </div>
  );
}
