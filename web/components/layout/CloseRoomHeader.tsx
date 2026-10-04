import { type FC, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { CloseRoomState } from '@/lib/store/types';
import type { RunLifecycle } from '@/lib/adapter/ingestion';
import {
  selectMatchRate,
  selectUnreconciledCents,
  selectRequiredActionsCount,
  selectDemoActionsCount,
  selectEventDuration,
} from '@/lib/store/selectors';
import { formatCentsAsCurrency, formatConfidence, formatDuration } from '@/lib/formatters';
import { CLOSE_STAGES } from '@/lib/contracts/contractC';
import { Badge } from '@/components/common/Badge';
import { MatchRateRing } from '@/components/common/MatchRateRing';

type CloseRoomHeaderProps = {
  state: CloseRoomState;
  lifecycle?: RunLifecycle;
  isDemoMode?: boolean;
  onOpenIntake?: () => void;
  onOpenUpload?: () => void;
  className?: string;
};

export const CloseRoomHeader: FC<CloseRoomHeaderProps> = ({
  state,
  lifecycle = 'active',
  isDemoMode = false,
  onOpenIntake,
  onOpenUpload,
  className = '',
}) => {
  const [copiedRunId, setCopiedRunId] = useState(false);
  const matchRate = selectMatchRate(state);
  const unreconciledCents = selectUnreconciledCents(state);
  const requiredActions = selectRequiredActionsCount(state);
  const demoActions = selectDemoActionsCount(state);
  const durationMs = selectEventDuration(state);
  const exceptionCount = Object.keys(state.exceptions).length;

  const handleCopyRunId = () => {
    if (state.runId) {
      navigator.clipboard.writeText(state.runId).then(() => {
        setCopiedRunId(true);
        setTimeout(() => setCopiedRunId(false), 2000);
      });
    }
  };

  const truncatedRunId = state.runId
    ? state.runId.length > 10
      ? state.runId.slice(0, 10)
      : state.runId
    : null;

  return (
    <header className={`border-b border-border bg-surface ${className}`}>
      {/* Top Banner: Forensic Assurance & Agent Activity Health */}
      <div className="border-b border-border bg-surface-subtle px-4 sm:px-6 py-2 text-xs font-medium text-foreground-muted">
        <div className="flex flex-wrap items-center justify-between gap-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full bg-matched"
              aria-hidden="true"
            />
            <span>
              <strong className="text-foreground">CloseProof produces proof, not ledger edits.</strong>{' '}
              {exceptionCount} open exception{exceptionCount === 1 ? '' : 's'} ·{' '}
              {requiredActions} with required action
              {state.mode === 'replay' && demoActions > 0 && (
                <> · {demoActions} recorded locally (demo)</>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Decoupled Connection State */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  state.connectionState === 'connected'
                    ? 'bg-matched'
                    : state.connectionState === 'polling'
                    ? 'bg-info animate-pulse'
                    : state.connectionState === 'connecting' || state.connectionState === 'reconnecting'
                    ? 'bg-exception animate-pulse'
                    : 'bg-foreground-subtle'
                }`}
              />
              <span className="capitalize text-foreground-muted">
                {state.connectionState === 'polling'
                  ? 'Polling API'
                  : state.mode === 'live'
                  ? state.connectionState
                  : 'Replay Feed'}
              </span>
            </div>

            {state.connectionState === 'polling' && (
              <Badge variant="info">Polling...</Badge>
            )}

            {state.runId ? (
              <span
                className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground-muted bg-surface-subtle border border-border px-2 py-0.5 rounded cursor-pointer group"
                title={`Full Run ID: ${state.runId}`}
              >
                <span>Run ID:</span>
                <span className="text-foreground font-semibold">{truncatedRunId}</span>
                <button
                  type="button"
                  onClick={handleCopyRunId}
                  className="p-0.5 text-foreground-muted hover:text-foreground focus:outline-none transition-colors"
                  aria-label="Copy Run ID to clipboard"
                  title="Copy full Run ID"
                >
                  {copiedRunId ? (
                    <Check className="w-3 h-3 text-matched" />
                  ) : (
                    <Copy className="w-3 h-3 group-hover:text-foreground" />
                  )}
                </button>
              </span>
            ) : (
              <span className="text-foreground-subtle italic text-xs">Run ID pending</span>
            )}

            {!isDemoMode && state.malformedCount > 0 && (
              <Badge variant="warning">{state.malformedCount} malformed</Badge>
            )}
            {!isDemoMode && state.warningCount > 0 && (
              <Badge variant="warning">{state.warningCount} warnings</Badge>
            )}
            {!isDemoMode && state.errorCount > 0 && (
              <Badge variant="error">{state.errorCount} errors</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Sample Data Honesty Banner */}
      {(state.mode === 'replay' || isDemoMode || !state.runId) && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 sm:px-6 py-1.5 text-[11px] font-medium flex flex-wrap items-center justify-between gap-2">
          <span>Sample company data (Acme Global). Upload your own files to run a real close.</span>
          {onOpenUpload && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="underline hover:opacity-80 font-semibold cursor-pointer"
            >
              Upload your own files
            </button>
          )}
        </div>
      )}

      {/* Main Bar: Title + Key Metrics */}
      <div className="px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Close Room
              </h1>
              {lifecycle === 'starting' && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-brand/10 text-brand font-medium animate-pulse">
                  Starting reconciliation...
                </span>
              )}
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">
              Autonomous month-end close and evidence verification workstation
            </p>
          </div>

          {/* Metric Cards */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Match Rate with SVG Ring */}
            <div className="rounded border border-border bg-surface-subtle px-3 py-2 flex items-center gap-3 min-w-[150px]">
              <MatchRateRing rate={matchRate.rate ?? 0} size="sm" />
              <div>
                <span className="text-[11px] font-medium text-foreground-muted block">
                  Match Rate
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-semibold text-foreground font-mono">
                    {matchRate.rate !== null ? formatConfidence(matchRate.rate) : '—'}
                  </span>
                  {matchRate.total > 0 && (
                    <span className="text-[11px] text-foreground-muted font-mono">
                      ({matchRate.matched}/{matchRate.total})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Unreconciled Gross Total */}
            <div className="rounded border border-border bg-surface-subtle px-3 py-2 min-w-[130px]">
              <span className="text-[11px] font-medium text-foreground-muted block">
                Unreconciled Total
              </span>
              <div className="mt-0.5">
                <span className="text-base font-semibold text-foreground font-mono">
                  {formatCentsAsCurrency(unreconciledCents)}
                </span>
              </div>
            </div>

            {/* Elapsed Clock */}
            <div className="rounded border border-border bg-surface-subtle px-3 py-2 min-w-[110px]">
              <span className="text-[11px] font-medium text-foreground-muted block">
                Elapsed (UTC)
              </span>
              <div className="mt-0.5">
                <span className="text-base font-semibold text-foreground font-mono">
                  {formatDuration(durationMs)}
                </span>
              </div>
            </div>

            {onOpenIntake && (
              <button
                type="button"
                onClick={onOpenIntake}
                className="rounded border border-border bg-surface hover:bg-surface-subtle px-3 py-2 text-xs font-medium text-foreground transition-colors"
              >
                Intake Sources
              </button>
            )}
          </div>
        </div>

        {/* Close Stage Stepper */}
        <div className="mt-4 border-t border-border pt-3">
          <nav aria-label="Close stages" className="flex items-center gap-1 overflow-x-auto pb-1">
            {CLOSE_STAGES.map((stage, idx) => {
              const currentIdx = CLOSE_STAGES.indexOf(state.stage);
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;

              return (
                <div
                  key={stage}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-sm shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-foreground text-background font-semibold'
                      : isPast
                      ? 'bg-matched-bg text-matched border border-matched-border'
                      : 'bg-surface-subtle text-foreground-muted border border-border'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span className="text-[11px] opacity-75 font-mono">{idx + 1}.</span>
                  <span>{stage}</span>
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
