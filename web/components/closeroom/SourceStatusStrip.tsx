'use client';

import React from 'react';
import { Upload } from 'lucide-react';
import type { SourceKey, StagedSourceFile } from '@/lib/adapter/ingestion';
import { SOURCE_DEFINITIONS } from '@/lib/adapter/ingestion';

interface SourceStatusStripProps {
  stagedFiles: Record<SourceKey, StagedSourceFile | null>;
  onOpenIntake?: () => void;
  onOpenUpload?: () => void;
  className?: string;
}

const SOURCES: SourceKey[] = ['bank', 'stripe', 'invoices', 'receipts'];

export function SourceStatusStrip({
  stagedFiles,
  onOpenIntake,
  onOpenUpload,
  className = '',
}: SourceStatusStripProps) {
  const isUsingSample = Object.values(stagedFiles).some((f) => f?.isSample);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded border border-border bg-surface-subtle text-xs">
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

        <div className="flex items-center gap-2.5">
          {onOpenUpload && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-brand text-brand-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity shadow-2xs cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>Upload your own files</span>
            </button>
          )}

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
      </div>

      {isUsingSample && (
        <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded flex items-center justify-between gap-2">
          <span>Sample company data (Acme Global). Upload your own files to run a real close.</span>
          {onOpenUpload && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="font-medium underline hover:opacity-80"
            >
              Upload files
            </button>
          )}
        </div>
      )}
    </div>
  );
}
