'use client';

import React from 'react';
import type { SourceKey, StagedSourceFile } from '@/lib/adapter/ingestion';
import { SOURCE_DEFINITIONS } from '@/lib/adapter/ingestion';

interface SourceStatusStripProps {
  stagedFiles: Record<SourceKey, StagedSourceFile | null>;
  onOpenIntake?: () => void;
  className?: string;
}

const SOURCES: SourceKey[] = ['bank', 'stripe', 'invoices', 'receipts'];

export function SourceStatusStrip({
  stagedFiles,
  onOpenIntake,
  className = '',
}: SourceStatusStripProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded border border-border bg-surface-subtle text-xs ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] uppercase font-semibold text-foreground-muted">
          Staged Sources:
        </span>
        {SOURCES.map((key) => {
          const file = stagedFiles[key];
          const def = SOURCE_DEFINITIONS[key];
          return (
            <div key={key} className="flex items-center gap-1.5 text-[11px]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  file ? 'bg-matched' : 'bg-foreground-subtle'
                }`}
              />
              <span className="text-foreground-muted font-medium">{def.label}:</span>
              <span className="font-mono text-foreground truncate max-w-[140px]">
                {file ? file.name : 'Not staged'}
              </span>
            </div>
          );
        })}
      </div>

      {onOpenIntake && (
        <button
          type="button"
          onClick={onOpenIntake}
          className="text-[11px] font-medium text-brand hover:underline font-mono"
        >
          Manage sources
        </button>
      )}
    </div>
  );
}
