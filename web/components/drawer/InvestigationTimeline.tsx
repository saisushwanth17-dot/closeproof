'use client';

import React from 'react';
import type { ReconItem } from '@/lib/contracts/contractB';
import type { TelemetryEvent } from '@/lib/contracts/contractC';
import { resolveAuthoritativeItemId } from '@/lib/contracts/guards';
import { formatUtcTime, normalizeTs } from '@/lib/formatters';

interface InvestigationTimelineProps {
  item: ReconItem;
  events?: TelemetryEvent[];
  className?: string;
}

export function InvestigationTimeline({
  item,
  events = [],
  className = '',
}: InvestigationTimelineProps) {
  // Authoritative item linkage: filter events strictly matching this item's ID
  const linkedEvents = events.filter((ev) => {
    const eventItemId = resolveAuthoritativeItemId(ev);
    return eventItemId !== null && eventItemId === item.id;
  });

  if (linkedEvents.length === 0 && item.candidates.length === 0) {
    return (
      <div className={`p-3 rounded border border-border bg-surface-subtle text-xs text-foreground-muted ${className}`}>
        No chronological stream events recorded for this item yet.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        Authoritative Event Timeline ({linkedEvents.length})
      </h4>

      <div className="relative pl-4 border-l border-border space-y-3">
        {linkedEvents.map((ev, idx) => {
          const epochMs = normalizeTs(ev.ts);
          const timeStr = formatUtcTime(epochMs);

          let eventLabel = ev.event as string;
          let eventSummary = '';
          let badgeColor = 'bg-surface-subtle text-foreground-muted border-border';

          switch (ev.event) {
            case 'recon_exception':
              eventLabel = 'Exception Flagged';
              eventSummary = 'Deterministic reconciliation detected anomaly';
              badgeColor = 'bg-exception-bg text-exception border-exception-border';
              break;
            case 'evidence_attached':
              eventLabel = 'Evidence Attached';
              eventSummary = 'Candidate record linked to exception graph';
              badgeColor = 'bg-brand/10 text-brand border-brand/30';
              break;
            case 'tavily_lookup':
              eventLabel = 'Verified externally';
              eventSummary = typeof ev.payload.query === 'string'
                ? `Vendor query: "${ev.payload.query}"`
                : 'External merchant verification';
              badgeColor = 'bg-info-bg text-info border-info-border';
              break;
            case 'explain_done':
              eventLabel = 'Explanation ready';
              eventSummary = 'Forensic reasoning synthesized root cause & confidence';
              badgeColor = 'bg-matched-bg text-matched border-matched-border';
              break;
            default:
              eventSummary = 'Activity logged';
          }

          return (
            <div key={`${ev.event}-${ev.ts}-${idx}`} className="relative group">
              {/* Dot */}
              <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-surface border-2 border-border group-hover:border-brand transition-colors" />

              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${badgeColor}`}
                >
                  {eventLabel}
                </span>
                <span className="text-[10px] font-mono text-foreground-subtle">
                  {timeStr}
                </span>
              </div>
              <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                {eventSummary}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
