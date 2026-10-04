import { type FC, useRef, useEffect, useState } from 'react';
import type { TelemetryEvent } from '@/lib/contracts/contractC';
import { EventRow } from './EventRow';

type TelemetryFeedProps = {
  events: readonly TelemetryEvent[];
  totalEventsCount?: number;
  className?: string;
};

export const TelemetryFeed: FC<TelemetryFeedProps> = ({
  events,
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll when new events arrive if user hasn't scrolled up
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // If within 50px of bottom, keep auto-scroll enabled
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(atBottom);
  };

  return (
    <div
      className={`flex flex-col border border-border bg-surface rounded overflow-hidden ${className}`}
      role="region"
      aria-label="Real-time Agent Activity"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface-subtle px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand motion-safe:animate-pulse" aria-hidden="true" />
          <div>
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Agent Activity
            </h2>
            <p className="text-[10px] text-foreground-muted">
              Streamed actions & thoughts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-foreground-muted font-mono">
          <span>
            Showing {events.length} of {events.length} events
          </span>
          {!autoScroll && (
            <button
              type="button"
              onClick={() => {
                setAutoScroll(true);
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }}
              className="text-xs text-brand hover:underline"
            >
              Resume scroll
            </button>
          )}
        </div>
      </div>

      {/* Stream Table */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto max-h-[380px] min-h-[220px]"
      >
        {events.length === 0 ? (
          <div className="p-8 text-center text-xs text-foreground-muted">
            Awaiting agent activity...
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-subtle text-[11px] text-foreground-muted font-medium sticky top-0 border-b border-border">
              <tr>
                <th className="py-1.5 pl-4 pr-2 font-mono">#</th>
                <th className="py-1.5 px-2">Time (UTC)</th>
                <th className="py-1.5 px-2">Severity</th>
                <th className="py-1.5 px-2">Activity</th>
                <th className="py-1.5 pl-2 pr-4">Summary</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, idx) => (
                <EventRow key={`${event.ts}-${idx}`} event={event} index={idx} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
