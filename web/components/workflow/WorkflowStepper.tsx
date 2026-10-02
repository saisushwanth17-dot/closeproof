'use client';

import React from 'react';
import type { CloseStage } from '@/lib/contracts/contractC';
import type { RunLifecycle } from '@/lib/adapter/ingestion';

export type WorkflowStepId = 'ingest' | 'reconcile' | 'review' | 'packet';

interface Step {
  id: WorkflowStepId;
  number: string;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 'ingest', number: '01', label: 'Data Intake', description: 'Staged source feeds' },
  { id: 'reconcile', number: '02', label: 'Reconciliation', description: 'Code-driven matching' },
  { id: 'review', number: '03', label: 'Exception Review', description: 'Evidence & citations' },
  { id: 'packet', number: '04', label: 'Close Packet', description: 'Accountant sign-off' },
];

interface WorkflowStepperProps {
  currentStage: CloseStage;
  lifecycle: RunLifecycle;
  onSelectStep?: (step: WorkflowStepId) => void;
  className?: string;
}

export function WorkflowStepper({
  currentStage,
  lifecycle,
  onSelectStep,
  className = '',
}: WorkflowStepperProps) {
  // Map stage/lifecycle to active step
  const getStepStatus = (
    stepId: WorkflowStepId
  ): 'completed' | 'active' | 'upcoming' => {
    if (lifecycle === 'idle' || lifecycle === 'ready') {
      return stepId === 'ingest' ? 'active' : 'upcoming';
    }

    if (lifecycle === 'starting') {
      if (stepId === 'ingest') return 'completed';
      if (stepId === 'reconcile') return 'active';
      return 'upcoming';
    }

    if (currentStage === 'Packet ready' || lifecycle === 'completed') {
      return 'completed';
    }

    if (currentStage === 'Explaining' || currentStage === 'Investigating' || currentStage === 'Analyzing') {
      if (stepId === 'ingest' || stepId === 'reconcile') return 'completed';
      if (stepId === 'review') return 'active';
      return 'upcoming';
    }

    if (currentStage === 'Reconciling' || currentStage === 'Ingesting') {
      if (stepId === 'ingest') return 'completed';
      if (stepId === 'reconcile') return 'active';
      return 'upcoming';
    }

    return 'upcoming';
  };

  return (
    <nav
      aria-label="Month-end close progress"
      className={`border-b border-border bg-surface px-4 py-2.5 ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(step.id);
          const isLast = idx === STEPS.length - 1;

          return (
            <React.Fragment key={step.id}>
              <div
                className={`flex items-center gap-2.5 min-w-max py-1 ${
                  onSelectStep ? 'cursor-pointer' : ''
                }`}
                onClick={() => onSelectStep?.(step.id)}
              >
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[11px] font-semibold transition-colors ${
                    status === 'completed'
                      ? 'bg-matched text-white'
                      : status === 'active'
                      ? 'bg-brand text-white shadow-sm ring-2 ring-brand/20'
                      : 'bg-surface-subtle text-foreground-muted border border-border'
                  }`}
                >
                  {status === 'completed' ? (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="3"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <div>
                  <div
                    className={`text-xs font-medium leading-none ${
                      status === 'active'
                        ? 'text-foreground font-semibold'
                        : status === 'completed'
                        ? 'text-foreground'
                        : 'text-foreground-muted'
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-[10px] text-foreground-subtle hidden sm:block mt-0.5 font-mono">
                    {step.description}
                  </div>
                </div>
              </div>

              {!isLast && (
                <div
                  className={`flex-1 h-px min-w-[16px] max-w-[64px] mx-2 ${
                    status === 'completed' ? 'bg-matched/50' : 'bg-border'
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}
