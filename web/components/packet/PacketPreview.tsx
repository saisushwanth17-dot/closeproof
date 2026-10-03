import { type FC, useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { CloseRoomState } from '@/lib/store/types';
import { selectPacketDiscrepancy, selectUnreconciledCents } from '@/lib/store/selectors';
import { formatCentsAsCurrency } from '@/lib/formatters';
import { Badge } from '@/components/common/Badge';
import { getPacketExportUrl, getHttpApiUrl } from '@/lib/api/config';

type PacketPreviewProps = {
  state: CloseRoomState;
  className?: string;
  markdownContent?: string | null;
};

/**
 * Parses summary KPI numbers from markdown header if available.
 * Handles both table format and bullet list format.
 */
function parsePacketMarkdownTotals(markdown: string): {
  matchedCount: number;
  exceptionCount: number;
  totalUnreconciledCents: number;
} | null {
  if (!markdown) return null;

  // Format A: Markdown table from core/packet.py
  // | **Match Rate** | **...%** (10 matched / 23 total) |
  // | **Total Unreconciled Exceptions** | **$12,196.29** (13 exceptions) |
  const matchTable = markdown.match(/\((\d+)\s+matched\s*\/\s*(\d+)\s+total\)/i);
  const excTable = markdown.match(/Total Unreconciled Exceptions\*\*\s*\|\s*\*\*([^\*]+)\*\*\s*\((\d+)\s+exceptions?\)/i);

  if (matchTable && excTable) {
    const matchedCount = parseInt(matchTable[1], 10);
    const exceptionCount = parseInt(excTable[2], 10);
    const amountStr = excTable[1].replace(/[^0-9.-]+/g, '');
    const totalUnreconciledCents = Math.round(parseFloat(amountStr) * 100);
    return { matchedCount, exceptionCount, totalUnreconciledCents };
  }

  // Format B: Bullet list from packet.sample.md
  const matchBullet = markdown.match(/Reconciled Transactions:\*\*\s*(\d+)/i);
  const excBullet = markdown.match(/Unresolved Exceptions:\*\*\s*(\d+)/i);
  const volBullet = markdown.match(/Total Gross Unreconciled Volume:\*\*\s*\$?([0-9,]+(?:\.[0-9]{2})?)/i);

  if (matchBullet && excBullet && volBullet) {
    const matchedCount = parseInt(matchBullet[1], 10);
    const exceptionCount = parseInt(excBullet[1], 10);
    const amountStr = volBullet[1].replace(/[^0-9.-]+/g, '');
    const totalUnreconciledCents = Math.round(parseFloat(amountStr) * 100);
    return { matchedCount, exceptionCount, totalUnreconciledCents };
  }

  return null;
}

export const PacketPreview: FC<PacketPreviewProps> = ({
  state,
  className = '',
  markdownContent = null,
}) => {
  const [sampleMarkdown, setSampleMarkdown] = useState<string>('');
  const [liveMarkdown, setLiveMarkdown] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load sample markdown for replay mode
  useEffect(() => {
    let isMounted = true;
    fetch('/replay/packet.sample.md')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (isMounted) setSampleMarkdown(text);
      })
      .catch((err) => {
        if (isMounted) setLoadError(err instanceof Error ? err.message : 'Failed to load');
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch live packet if runId exists and markdownContent not explicitly supplied
  useEffect(() => {
    if (state.runId && state.mode === 'live' && !markdownContent) {
      const apiUrl = getHttpApiUrl();
      fetch(`${apiUrl}/api/runs/${encodeURIComponent(state.runId)}/packet.md`)
        .then((res) => {
          if (res.ok) return res.text();
          throw new Error(`HTTP ${res.status}`);
        })
        .then((text) => setLiveMarkdown(text))
        .catch((err) => console.warn('Could not fetch live packet in preview:', err));
    }
  }, [state.runId, state.mode, markdownContent]);

  const activeMarkdown = markdownContent || liveMarkdown || sampleMarkdown;

  // Derived live items totals from state
  const reducedMatched = Object.keys(state.matchedItems).length;
  const reducedExceptions = Object.keys(state.exceptions).length;
  const reducedUnreconciledCents = selectUnreconciledCents(state);

  // Header summary totals from state.packetSummary OR parsed from current active markdown
  const summaryTotals = useMemo(() => {
    if (state.packetSummary) {
      return {
        matchedCount: state.packetSummary.matchedCount,
        exceptionCount: state.packetSummary.exceptionCount,
        totalUnreconciledCents: state.packetSummary.totalUnreconciledCents,
      };
    }
    return parsePacketMarkdownTotals(activeMarkdown);
  }, [state.packetSummary, activeMarkdown]);

  // Compute discrepancy client-side from the same arrays
  const discrepancy = useMemo(() => {
    if (!summaryTotals) {
      return selectPacketDiscrepancy(state);
    }
    const isMatchedEqual = reducedMatched === summaryTotals.matchedCount;
    const isExceptionEqual = reducedExceptions === summaryTotals.exceptionCount;
    const isAmountEqual = Math.abs(reducedUnreconciledCents - summaryTotals.totalUnreconciledCents) <= 1;

    if (!isMatchedEqual || !isExceptionEqual || !isAmountEqual) {
      return {
        reducedMatched,
        reducedExceptions,
        reducedUnreconciledCents,
        summaryMatched: summaryTotals.matchedCount,
        summaryExceptions: summaryTotals.exceptionCount,
        summaryUnreconciledCents: summaryTotals.totalUnreconciledCents,
      };
    }
    return null;
  }, [summaryTotals, state, reducedMatched, reducedExceptions, reducedUnreconciledCents]);

  const isVerified = Boolean(state.packetReady && !discrepancy);

  const mdExportUrl = state.runId ? getPacketExportUrl(state.runId, 'md') : null;

  const handleCopy = () => {
    if (activeMarkdown) {
      navigator.clipboard.writeText(activeMarkdown).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div
      id="packet-preview-section"
      className={`flex flex-col border border-border bg-surface rounded overflow-hidden ${className}`}
      role="region"
      aria-label="Accountant-Ready Close Packet Preview"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              state.packetReady ? 'bg-matched' : 'bg-foreground-subtle'
            }`}
            aria-hidden="true"
          />
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Accountant-Ready Close Packet
          </h2>
          {state.packetReady ? (
            <Badge variant="success">Ready for Review</Badge>
          ) : (
            <Badge variant="neutral">Compiling</Badge>
          )}
        </div>

        {/* Export and Action Buttons */}
        <div className="flex items-center gap-2 no-print">
          {activeMarkdown && (
            <button
              type="button"
              onClick={handleCopy}
              className="rounded border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-subtle transition-colors"
            >
              {copied ? 'Copied!' : 'Copy Markdown'}
            </button>
          )}

          {/* Print / Save as PDF Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-subtle transition-colors cursor-pointer"
            title="Print or Save as PDF"
          >
            Print / Save as PDF
          </button>

          {state.mode === 'live' ? (
            <>
              {mdExportUrl ? (
                <a
                  href={mdExportUrl}
                  download={`packet-${state.runId}.md`}
                  className={`rounded border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-subtle transition-colors ${
                    !state.packetReady ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  Export .MD
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="rounded border border-border bg-surface-subtle px-3 py-1 text-xs font-medium text-foreground-subtle cursor-not-allowed"
                  title="Run ID unavailable"
                >
                  Export .MD (Unavailable)
                </button>
              )}
            </>
          ) : (
            <>
              {/* Replay mode downloads synthetic sample file */}
              <a
                href="/replay/packet.sample.md"
                download="closeproof-packet.sample.md"
                className="rounded border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-subtle transition-colors"
              >
                Download Sample .MD
              </a>
            </>
          )}
        </div>
      </div>

      {/* Two-State Discrepancy / Verification Banner */}
      {discrepancy ? (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-400">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Discrepancy detected between packet summary and reduced totals:</span>
          </div>
          <div className="mt-1 font-mono text-[11px] grid grid-cols-2 gap-2">
            <div>
              Reduced: {discrepancy.reducedMatched} matched, {discrepancy.reducedExceptions} exceptions,{' '}
              {formatCentsAsCurrency(discrepancy.reducedUnreconciledCents)}
            </div>
            <div>
              Packet Summary: {discrepancy.summaryMatched} matched, {discrepancy.summaryExceptions} exceptions,{' '}
              {formatCentsAsCurrency(discrepancy.summaryUnreconciledCents)}
            </div>
          </div>
        </div>
      ) : isVerified ? (
        <div className="border-b border-matched/30 bg-matched/10 px-4 py-2.5 text-xs text-matched flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-matched shrink-0" />
            <span>Packet totals verified against run ledger</span>
          </div>
          <div className="font-mono text-[11px] opacity-90">
            {reducedMatched} matched · {reducedExceptions} exceptions · {formatCentsAsCurrency(reducedUnreconciledCents)} unreconciled
          </div>
        </div>
      ) : null}

      {/* Markdown Content Area */}
      <div className="p-5 max-h-[460px] overflow-y-auto prose dark:prose-invert prose-xs max-w-none text-foreground">
        {state.mode === 'live' && !state.packetReady && !activeMarkdown ? (
          <div className="text-center text-xs text-foreground-muted py-8 font-mono">
            Live stream connected. Standby for packet_ready telemetry frame...
          </div>
        ) : activeMarkdown ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline hover:opacity-80"
                >
                  {children}
                </a>
              ),
            }}
          >
            {activeMarkdown}
          </ReactMarkdown>
        ) : loadError ? (
          <div className="text-center text-xs text-foreground-muted py-8">
            Could not load packet preview: {loadError}
          </div>
        ) : (
          <div className="text-center text-xs text-foreground-muted py-8">
            Compiling close packet...
          </div>
        )}
      </div>
    </div>
  );
};
