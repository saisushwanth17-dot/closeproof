import { type FC, memo } from 'react';
import type { TelemetryEvent } from '@/lib/contracts/contractC';
import { formatUtcTime, formatCentsAsCurrency, dollarsToCents } from '@/lib/formatters';
import { Badge } from '@/components/common/Badge';

type EventRowProps = {
  event: TelemetryEvent;
  index: number;
};

export const EVENT_HUMAN_LABELS: Record<string, string> = {
  recon_match: 'Matched',
  recon_exception: 'Flagged exception',
  explain_done: 'Explanation ready',
  tavily_lookup: 'Verified externally',
  packet_ready: 'Close packet compiled',
  feed_ingested: 'Source ingested',
  sandbox_result: 'Sandbox check done',
  action_applied: 'Action recorded',
};

function formatPayloadSummary(event: TelemetryEvent): string {
  const { payload } = event;
  switch (event.event) {
    case 'feed_ingested':
      return `Ingested ${String(payload.count ?? 0)} records from ${String(payload.source ?? 'feed')}`;
    case 'recon_match': {
      const amt = typeof payload.amount === 'number' ? formatCentsAsCurrency(dollarsToCents(payload.amount)) : '';
      return `Matched item ${String(payload.id ?? '')} (${amt}): ${String(payload.explanation ?? 'direct match')}`;
    }
    case 'recon_exception': {
      const amt = typeof payload.amount === 'number' ? formatCentsAsCurrency(dollarsToCents(payload.amount)) : '';
      return `Exception on ${String(payload.id ?? '')} (${amt}): ${String(payload.explanation ?? '')} [action: ${String(payload.human_action ?? 'none')}]`;
    }
    case 'evidence_attached':
      return `Attached candidate evidence to ${String(payload.item_id ?? '')}`;
    case 'tavily_lookup': {
      const urls = Array.isArray(payload.urls) ? payload.urls.length : 0;
      return `External verification "${String(payload.query ?? '')}" returned ${urls} source(s)`;
    }
    case 'explain_done':
      return `AI forensic explanation generated for ${String(payload.item_id ?? '')}`;
    case 'sandbox_result':
      return `Sandbox check verified item ${String(payload.item_id ?? '')} (exit code ${String(payload.exit_code ?? 0)})`;
    case 'packet_ready':
      return `Close packet compiled for run ${String(payload.run_id ?? '')}`;
    case 'action_applied':
      return `Action ${String(payload.action ?? '')} recorded for item ${String(payload.item_id ?? '')}`;
    default:
      return JSON.stringify(payload);
  }
}

export const EventRow: FC<EventRowProps> = memo(({ event, index }) => {
  const humanLabel = EVENT_HUMAN_LABELS[event.event] || event.event;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 text-xs transition-colors">
      <td className="py-2 pl-4 pr-2 font-mono text-slate-500 whitespace-nowrap">
        {index + 1}
      </td>
      <td className="py-2 px-2 font-mono text-slate-600 whitespace-nowrap">
        {formatUtcTime(event.ts)}
      </td>
      <td className="py-2 px-2 whitespace-nowrap">
        <Badge
          variant={
            event.severity === 'error'
              ? 'error'
              : event.severity === 'warn'
              ? 'warning'
              : 'info'
          }
        >
          {event.severity}
        </Badge>
      </td>
      <td className="py-2 px-2 whitespace-nowrap">
        <span
          title={event.event}
          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-surface-subtle border border-border text-foreground cursor-help"
        >
          {humanLabel}
        </span>
      </td>
      <td className="py-2 pl-2 pr-4 text-slate-700 truncate max-w-md">
        {formatPayloadSummary(event)}
      </td>
    </tr>
  );
});

EventRow.displayName = 'EventRow';
