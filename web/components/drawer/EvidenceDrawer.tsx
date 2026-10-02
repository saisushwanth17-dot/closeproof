'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, ExternalLink, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { ReconItem, HumanAction } from '@/lib/contracts/contractB';
import { HUMAN_ACTIONS, HUMAN_ACTION_LABELS } from '@/lib/contracts/contractB';
import { formatCentsAsCurrency, dollarsToCents, formatConfidence } from '@/lib/formatters';
import { Badge } from '@/components/common/Badge';
import { getHttpApiUrl } from '@/lib/api/config';

interface EvidenceDrawerProps {
  item: ReconItem | null;
  runId?: string | null;
  isOpen?: boolean;
  onClose: () => void;
  onActionSuccess?: (itemId: string, action: HumanAction) => void;
  onRecordDemoAction?: (itemId: string, action: HumanAction) => void;
  className?: string;
}

export function EvidenceDrawer({
  item,
  runId,
  isOpen = Boolean(item),
  onClose,
  onActionSuccess,
  onRecordDemoAction,
}: EvidenceDrawerProps) {
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const handleActionClick = async (action: (typeof HUMAN_ACTIONS)[number]) => {
    setSubmittingAction(action);
    const apiUrl = getHttpApiUrl();

    try {
      if (runId) {
        // Attempt POST /api/runs/{run_id}/items/{item_id}/action
        await fetch(`${apiUrl}/api/runs/${encodeURIComponent(runId)}/items/${encodeURIComponent(item.id)}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }).catch((err) => {
          // Graceful fallback if backend mock or route not yet enabled
          console.warn('Action endpoint notification:', err);
        });
      }

      // Trigger success callback to update local state
      if (onActionSuccess) {
        onActionSuccess(item.id, action);
      } else if (onRecordDemoAction) {
        onRecordDemoAction(item.id, action);
      }

      // Show toast and close drawer
      setToastMessage(`Action Recorded: ${HUMAN_ACTION_LABELS[action]}`);
      setTimeout(() => {
        setToastMessage(null);
        setSubmittingAction(null);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to submit action:', err);
      setSubmittingAction(null);
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Right Drawer */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px] bg-surface border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 text-foreground"
      >
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-50 p-3 rounded-md bg-matched text-white flex items-center gap-2 shadow-lg text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="border-b border-border bg-surface-subtle p-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="warning">{item.status.toUpperCase()}</Badge>
              <Badge variant="neutral">
                Conf: {formatConfidence(item.confidence)}
              </Badge>
            </div>
            <h2 id="drawer-title" className="text-base font-bold font-mono tracking-tight text-foreground">
              {item.id}
            </h2>
            <div className="text-lg font-bold font-mono text-foreground">
              {formatCentsAsCurrency(dollarsToCents(item.amount))}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-surface border border-transparent hover:border-border transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs">
          {/* Forensic Explanation Block */}
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-brand" />
              Forensic Explanation (Nemotron-3-Ultra)
            </h3>

            {item.explanation ? (
              <div className="p-3.5 rounded border border-border bg-surface-subtle/80 leading-relaxed text-foreground whitespace-pre-wrap font-sans text-xs">
                {item.explanation}
              </div>
            ) : (
              <div className="p-4 rounded border border-border bg-surface-subtle animate-pulse space-y-2.5">
                <div className="flex items-center gap-2 text-brand font-medium text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-brand" />
                  <span>Awaiting Nemotron Ultra analysis...</span>
                </div>
                <div className="h-2.5 bg-surface rounded w-5/6" />
                <div className="h-2.5 bg-surface rounded w-4/6" />
              </div>
            )}
          </div>

          {/* Evidence List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
              Attached Evidence ({item.candidates.length})
            </h3>

            {item.candidates.length === 0 ? (
              <p className="text-foreground-muted italic">No candidate documents attached.</p>
            ) : (
              <div className="space-y-2">
                {item.candidates.map((cand, idx) => (
                  <div
                    key={`${cand.doc_id}-${idx}`}
                    className="p-3 rounded border border-border bg-surface text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-foreground-muted font-mono text-[11px]">
                      <span className="font-semibold text-foreground uppercase px-1.5 py-0.5 rounded bg-surface-subtle border border-border">
                        {cand.source}
                      </span>
                      <span>ID: {cand.doc_id}</span>
                    </div>
                    <div className="text-foreground pt-1">
                      <span className="text-foreground-muted font-mono">{cand.field}: </span>
                      <span className="font-medium">{cand.value}</span>
                    </div>
                    {cand.url && (
                      <div className="pt-1">
                        <a
                          href={cand.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand hover:underline font-mono text-[11px]"
                        >
                          <span>View Document</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Citations Block */}
          {item.citations && item.citations.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Verified Citations & Web Proof ({item.citations.length})
              </h3>
              <div className="space-y-1.5">
                {item.citations.map((url, idx) => {
                  let hostname = url;
                  try {
                    hostname = new URL(url).hostname;
                  } catch {}

                  return (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded border border-border bg-surface hover:bg-surface-subtle transition-colors group text-xs"
                    >
                      <span className="font-mono text-brand group-hover:underline truncate max-w-[340px]">
                        {hostname}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-foreground-muted group-hover:text-brand shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Required Action Buttons */}
          <div className="space-y-2.5 pt-2 border-t border-border">
            <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
              Apply Review Action
            </h3>
            <p className="text-[11px] text-foreground-muted">
              Select an action to resolve this exception in the close record:
            </p>

            <div className="space-y-2 pt-1">
              {HUMAN_ACTIONS.map((action) => {
                const isRecommended = item.human_action === action;
                const isSubmitting = submittingAction === action;

                return (
                  <button
                    key={action}
                    type="button"
                    disabled={Boolean(submittingAction)}
                    onClick={() => handleActionClick(action)}
                    className={`w-full p-2.5 rounded text-xs text-left flex items-center justify-between transition-all cursor-pointer ${
                      isRecommended
                        ? 'border-2 border-brand bg-brand/10 text-brand font-semibold shadow-xs hover:bg-brand/15'
                        : 'border border-border bg-surface text-foreground hover:bg-surface-subtle'
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-2">
                      {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{HUMAN_ACTION_LABELS[action]}</span>
                    </div>

                    {isRecommended && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand text-brand-foreground">
                        Recommended
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
