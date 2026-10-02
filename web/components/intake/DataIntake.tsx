'use client';

import React, { useState } from 'react';
import {
  type SourceKey,
  type StagedSourceFile,
  type RunLifecycle,
  SOURCE_DEFINITIONS,
  validateSourceFile,
} from '@/lib/adapter/ingestion';
import { SourceUploadCard } from './SourceUploadCard';

interface DataIntakeProps {
  stagedFiles: Record<SourceKey, StagedSourceFile | null>;
  onStageFile: (key: SourceKey, file: StagedSourceFile) => void;
  onRemoveFile: (key: SourceKey) => void;
  onLoadSampleBatch: () => void;
  onClearAll: () => void;
  onStartReconciliation: () => void;
  lifecycle: RunLifecycle;
  mode: 'live' | 'replay';
  onSwitchMode?: (mode: 'live' | 'replay') => void;
}

const SOURCE_KEYS: SourceKey[] = ['bank', 'stripe', 'invoices', 'receipts'];

export function DataIntake({
  stagedFiles,
  onStageFile,
  onRemoveFile,
  onLoadSampleBatch,
  onClearAll,
  onStartReconciliation,
  lifecycle,
  mode,
  onSwitchMode,
}: DataIntakeProps) {
  const [errors, setErrors] = useState<Partial<Record<SourceKey, string>>>({});

  const handleFileSelect = (key: SourceKey, file: File) => {
    const validation = validateSourceFile(file, key);
    if (!validation.valid) {
      setErrors((prev) => ({ ...prev, [key]: validation.error }));
      return;
    }

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });

    onStageFile(key, {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified,
      isSample: false,
    });
  };

  const handleRemove = (key: SourceKey) => {
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    onRemoveFile(key);
  };

  const stagedCount = SOURCE_KEYS.filter((k) => stagedFiles[k] !== null).length;
  const isStarting = lifecycle === 'starting';
  const hasStagedSources = stagedCount > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-brand/10 text-brand font-semibold">
              STAGE 01
            </span>
            <h1 className="text-xl font-bold text-foreground">Data Intake & Source Staging</h1>
          </div>
          <p className="text-sm text-foreground-muted mt-1 max-w-2xl">
            Stage financial ledgers, payout settlement feeds, invoice registers, and receipt images
            prior to autonomous reconciliation. Accounting calculations are code-driven.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadSampleBatch}
            disabled={isStarting}
            className="px-3 py-1.5 text-xs font-medium rounded border border-border bg-surface hover:bg-surface-subtle text-foreground transition-colors disabled:opacity-50"
          >
            Load Sample Batch
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={isStarting || stagedCount === 0}
            className="px-3 py-1.5 text-xs font-medium rounded border border-border bg-surface hover:bg-surface-subtle text-foreground-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Grid of 4 Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        {SOURCE_KEYS.map((key) => (
          <SourceUploadCard
            key={key}
            sourceDef={SOURCE_DEFINITIONS[key]}
            stagedFile={stagedFiles[key]}
            onFileSelect={(file) => handleFileSelect(key, file)}
            onRemove={() => handleRemove(key)}
            error={errors[key]}
            disabled={isStarting}
          />
        ))}
      </div>

      {/* Action Footer & Validation Checklist */}
      <div className="rounded border border-border bg-surface-subtle p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hasStagedSources ? 'bg-matched' : 'bg-foreground-subtle'
              }`}
            />
            <span className="text-foreground font-medium">
              {stagedCount} of {SOURCE_KEYS.length} sources staged
            </span>
          </div>
          {onSwitchMode && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-foreground-muted border-l border-border pl-3">
              <span>Stream mode:</span>
              <button
                type="button"
                onClick={() => onSwitchMode(mode === 'live' ? 'replay' : 'live')}
                className="font-mono font-medium text-brand hover:underline"
              >
                {mode === 'live' ? 'Live WebSocket' : 'Deterministic Replay'}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={onStartReconciliation}
            disabled={!hasStagedSources || isStarting}
            className={`w-full md:w-auto px-5 py-2.5 rounded text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              isStarting
                ? 'bg-brand/80 text-white cursor-wait'
                : hasStagedSources
                ? 'bg-brand text-white hover:opacity-90 shadow-sm cursor-pointer'
                : 'bg-surface-subtle text-foreground-subtle border border-border cursor-not-allowed'
            }`}
          >
            {isStarting && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{isStarting ? 'Starting reconciliation...' : 'Start reconciliation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
