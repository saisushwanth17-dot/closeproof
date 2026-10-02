import { type FC } from 'react';
import type { ReconItem } from '@/lib/contracts/contractB';
import { HUMAN_ACTION_LABELS } from '@/lib/contracts/contractB';
import { formatCentsAsCurrency, dollarsToCents, formatConfidence } from '@/lib/formatters';
import { Badge } from '@/components/common/Badge';

type ExceptionQueueProps = {
  exceptions: Record<string, ReconItem>;
  demoActions: Record<string, string | null>;
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  demoBeatItemId?: string | null;
  className?: string;
};

export const ExceptionQueue: FC<ExceptionQueueProps> = ({
  exceptions,
  demoActions,
  selectedItemId,
  onSelectItem,
  demoBeatItemId = null,
  className = '',
}) => {
  // Deterministic sorting by item ID to guarantee stable row ordering
  const items = Object.values(exceptions).sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div
      className={`flex flex-col border border-border bg-surface rounded overflow-hidden ${className}`}
      role="region"
      aria-label="Exception Queue"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface-subtle px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-exception" aria-hidden="true" />
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Exceptions Requiring Review ({items.length})
          </h2>
        </div>
        <span className="text-xs text-foreground-muted font-mono">
          Select an exception to inspect evidence
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-foreground-muted">
            No exceptions currently recorded.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-subtle text-[11px] text-foreground-muted font-medium border-b border-border">
              <tr>
                <th className="py-2 pl-4 pr-2 font-mono">Item ID</th>
                <th className="py-2 px-2 text-right">Amount</th>
                <th className="py-2 px-2">Description</th>
                <th className="py-2 px-2 text-center">Confidence</th>
                <th className="py-2 px-2">Required Action</th>
                <th className="py-2 pl-2 pr-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isSelected = item.id === selectedItemId;
                const isDemoBeat = demoBeatItemId !== null && item.id === demoBeatItemId;
                const demoAction = demoActions[item.id];
                const actionLabel = item.human_action
                  ? HUMAN_ACTION_LABELS[item.human_action]
                  : 'Manual review';

                return (
                  <tr
                    key={item.id}
                    id={`queue-row-${item.id}`}
                    onClick={() => onSelectItem(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectItem(item.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    aria-label={`Select exception ${item.id}`}
                    className={`cursor-pointer border-b border-border/50 text-xs transition-colors focus:outline-none focus:bg-surface-subtle ${
                      isSelected
                        ? 'bg-brand/10 border-l-4 border-l-brand'
                        : isDemoBeat
                        ? 'bg-exception-bg/40 hover:bg-exception-bg/70'
                        : 'hover:bg-surface-subtle'
                    }`}
                  >
                    <td className="py-2.5 pl-4 pr-2 font-mono font-medium text-foreground whitespace-nowrap">
                      {item.id}
                      {isDemoBeat && (
                        <span className="ml-1.5 text-[10px] bg-exception-bg text-exception border border-exception-border px-1 py-0.5 rounded-sm font-sans font-semibold">
                          Demo Beat
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                      {formatCentsAsCurrency(dollarsToCents(item.amount))}
                    </td>
                    <td className="py-2.5 px-2 text-foreground-muted max-w-xs truncate">
                      {item.explanation || 'No initial summary'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono text-foreground whitespace-nowrap">
                      <span className="font-medium">{formatConfidence(item.confidence)}</span>
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <Badge variant="warning">{actionLabel}</Badge>
                    </td>
                    <td className="py-2.5 pl-2 pr-4 text-right whitespace-nowrap">
                      {demoAction ? (
                        <Badge variant="success">Recorded (demo)</Badge>
                      ) : (
                        <Badge variant="neutral">Pending</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
