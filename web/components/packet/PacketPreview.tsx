import { type FC, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CloseRoomState } from '@/lib/store/types';
import { selectPacketDiscrepancy } from '@/lib/store/selectors';
import { formatCentsAsCurrency } from '@/lib/formatters';
import { Badge } from '@/components/common/Badge';
import { getPacketExportUrl } from '@/lib/api/config';

type PacketPreviewProps = {
  state: CloseRoomState;
  className?: string;
};

export const PacketPreview: FC<PacketPreviewProps> = ({ state, className = '' }) => {
  const [sampleMarkdown, setSampleMarkdown] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const discrepancy = selectPacketDiscrepancy(state);

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

  const mdExportUrl = state.runId ? getPacketExportUrl(state.runId, 'md') : null;

  const handleCopy = () => {
    if (sampleMarkdown) {
      navigator.clipboard.writeText(sampleMarkdown).then(() => {
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
          {sampleMarkdown && (
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

      {/* Discrepancy Warning Banner */}
      {discrepancy && (
        <div className="border-b border-exception-border bg-exception-bg px-4 py-2.5 text-xs text-exception">
          <div className="flex items-center gap-1.5 font-semibold">
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
      )}

      {/* Markdown Content Area */}
      <div className="p-5 max-h-[460px] overflow-y-auto prose dark:prose-invert prose-xs max-w-none text-foreground">
        {state.mode === 'live' && !state.packetReady ? (
          <div className="text-center text-xs text-foreground-muted py-8 font-mono">
            Live stream connected. Standby for packet_ready telemetry frame...
          </div>
        ) : sampleMarkdown ? (
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
            {sampleMarkdown}
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
