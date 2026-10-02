import { type FC, memo } from 'react';
import type { TelemetryEvent } from '@/lib/contracts/contractC';
import { formatUtcTime, formatCentsAsCurrency, dollarsToCents } from '@/lib/formatters';
import { Badge } from '@/components/common/Badge';

type EventRowProps = {
  event: TelemetryEvent;
  index: number;
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
      return `Tavily search "${String(payload.query ?? '')}" returned ${urls} source(s)`;
    }
    case 'explain_done':
      return `Nemotron ${String(payload.model_tier ?? 'ultra')} explanation generated for ${String(payload.item_id ?? '')}`;
    case 'sandbox_result':
      return `Nebius sandbox verified item ${String(payload.item_id ?? '')} (exit code ${String(payload.exit_code ?? 0)})`;
    case 'packet_ready':
      return `Reconciliation packet compiled for run ${String(payload.run_id ?? '')}`;
    default:
      return JSON.stringify(payload);
  }
}

export const EventRow: FC<EventRowProps> = memo(({ event, index }) => {
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
      <td className="py-2 px-2 font-mono font-medium text-slate-900 whitespace-nowrap">
        {event.event}
      </td>
      <td className="py-2 pl-2 pr-4 text-slate-700 truncate max-w-md">
        {formatPayloadSummary(event)}
      </td>
    </tr>
  );
});

EventRow.displayName = 'EventRow';
