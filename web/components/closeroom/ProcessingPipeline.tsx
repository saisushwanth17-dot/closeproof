'use client';

import React, { useState } from 'react';
import type { CloseStage } from '@/lib/contracts/contractC';
import type { RunLifecycle } from '@/lib/adapter/ingestion';
import { STAGE_INFOS, ProcessingStageDetail } from './ProcessingStageDetail';

interface ProcessingPipelineProps {
  currentStage: CloseStage;
  lifecycle: RunLifecycle;
  eventCount?: number;
  className?: string;
}

export function ProcessingPipeline({
  currentStage,
  lifecycle,
  eventCount = 0,
  className = '',
}: ProcessingPipelineProps) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  // Compute status for each of the 5 pipeline stages
  const getStageStatus = (
    stageId: string
  ): { status: 'idle' | 'starting' | 'active' | 'completed'; label: string } => {
    if (lifecycle === 'idle' || lifecycle === 'ready') {
      return { status: 'idle', label: 'Standby' };
    }

    if (lifecycle === 'starting') {
      return { status: 'starting', label: 'Standby' };
    }

    if (lifecycle === 'completed' || currentStage === 'Packet ready') {
      return { status: 'completed', label: 'Verified' };
    }

    switch (stageId) {
      case 'intake':
        return { status: 'completed', label: 'Ingested' };
      case 'nano':
        if (currentStage === 'Ingesting') return { status: 'active', label: 'Extracting' };
        return { status: 'completed', label: 'Extracted' };
      case 'recon':
        if (currentStage === 'Reconciling') return { status: 'active', label: 'Matching' };
        if (['Investigating', 'Explaining', 'Analyzing'].includes(currentStage)) {
          return { status: 'completed', label: 'Reconciled' };
        }
        return { status: 'idle', label: 'Queued' };
      case 'ultra':
        if (['Investigating', 'Explaining', 'Analyzing'].includes(currentStage)) {
          return { status: 'active', label: 'Reasoning' };
        }
        return { status: 'idle', label: 'Queued' };
      case 'packet':
        return { status: 'idle', label: 'Pending' };
      default:
        return { status: 'idle', label: 'Queued' };
    }
  };

  const isStarting = lifecycle === 'starting';

  return (
    <section
      aria-label="Processing pipeline"
      className={`rounded border border-border bg-surface p-3 sm:p-4 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Autonomous Processing Pipeline
          </h2>
          {isStarting && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-brand/10 text-brand">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              Starting reconciliation... Standby for stream events
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-foreground-subtle font-mono">
          {eventCount > 0 && <span>{eventCount} events processed ·</span>}
          <span>Click stage for architecture rationale</span>
        </div>
      </div>

      {/* 5 Architectural Stages */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {STAGE_INFOS.map((stage) => {
          const { status, label } = getStageStatus(stage.id);
          const isSelected = selectedStageId === stage.id;

          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setSelectedStageId(isSelected ? null : stage.id)}
              className={`p-2.5 rounded border text-left transition-all relative ${
                isSelected
                  ? 'border-brand ring-1 ring-brand bg-surface-subtle'
                  : 'border-border bg-surface hover:bg-surface-subtle'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-mono text-foreground-subtle uppercase">
                  {stage.id}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-medium ${
                    status === 'completed'
                      ? 'bg-matched-bg text-matched border border-matched-border'
                      : status === 'active'
                      ? 'bg-brand/10 text-brand border border-brand/30 animate-pulse'
                      : status === 'starting'
                      ? 'bg-surface-subtle text-foreground-muted border border-border'
                      : 'bg-surface-subtle text-foreground-subtle border border-border'
                  }`}
                >
                  {label}
                </span>
              </div>
              <div className="text-xs font-semibold text-foreground line-clamp-1">
                {stage.name}
              </div>
              <div className="text-[10px] text-foreground-muted mt-0.5 font-mono line-clamp-1">
                {stage.engine}
              </div>
            </button>
          );
        })}
      </div>

      {/* Rationale Drawer */}
      <ProcessingStageDetail
        selectedStageId={selectedStageId}
        onClose={() => setSelectedStageId(null)}
      />
    </section>
  );
}
