'use client';

import React, { useRef } from 'react';
import type { SourceDefinition, StagedSourceFile } from '@/lib/adapter/ingestion';
import { formatFileSize } from '@/lib/adapter/ingestion';

interface SourceUploadCardProps {
  sourceDef: SourceDefinition;
  stagedFile: StagedSourceFile | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  error?: string | null;
  disabled?: boolean;
}

export function SourceUploadCard({
  sourceDef,
  stagedFile,
  onFileSelect,
  onRemove,
  error,
  disabled = false,
}: SourceUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
    // Reset input so same file can be re-selected if cleared
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div
      className={`rounded border p-4 flex flex-col justify-between transition-colors ${
        error
          ? 'border-red-500/50 bg-red-500/5 dark:bg-red-950/10'
          : stagedFile
          ? 'border-matched-border bg-matched-bg/20'
          : 'border-border bg-surface'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h3 className="text-sm font-semibold text-foreground">{sourceDef.label}</h3>
          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-subtle text-foreground-muted border border-border">
            {sourceDef.formatLabel}
          </span>
        </div>
        <p className="text-xs text-foreground-muted mb-3 leading-relaxed">
          {sourceDef.description}
        </p>

        {stagedFile ? (
          <div className="p-2.5 rounded border border-border bg-surface flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-medium text-foreground truncate">
                  {stagedFile.name}
                </span>
                {stagedFile.isSample && (
                  <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-brand/10 text-brand">
                    Sample
                  </span>
                )}
              </div>
              <span className="text-[11px] text-foreground-muted font-mono">
                {formatFileSize(stagedFile.size)}
              </span>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={onRemove}
                className="text-xs text-foreground-muted hover:text-red-600 dark:hover:text-red-400 p-1 transition-colors"
                aria-label={`Remove ${sourceDef.label} file`}
              >
                Remove
              </button>
            )}
          </div>
        ) : (
          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            onClick={() => !disabled && inputRef.current?.click()}
            onKeyDown={(e) => {
              if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            aria-label={`Upload ${sourceDef.label} (${sourceDef.formatLabel})`}
            className={`border border-dashed border-border rounded p-4 text-center cursor-pointer hover:border-brand transition-colors ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-subtle'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={sourceDef.acceptedExtensions.join(',')}
              onChange={handleInputChange}
              disabled={disabled}
            />
            <div className="text-xs text-foreground-muted">
              <span className="font-medium text-foreground">Click to upload</span> or drag and drop
            </div>
            <div className="text-[11px] text-foreground-subtle mt-1 font-mono">
              Accepts {sourceDef.formatLabel}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
            {error}
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-border/50 text-[11px] text-foreground-subtle">
        Role: {sourceDef.pipelineRole}
      </div>
    </div>
  );
}
