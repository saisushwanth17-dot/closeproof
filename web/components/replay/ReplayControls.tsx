import { type FC } from 'react';
import type { ReplaySpeed, ReplayState, SourceMode } from '@/lib/constants';
import { REPLAY_SPEEDS } from '@/lib/constants';
import { Badge } from '@/components/common/Badge';

type ReplayControlsProps = {
  mode: SourceMode;
  state: ReplayState;
  speed: ReplaySpeed;
  currentIndex?: number;
  totalEvents?: number;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
  onModeSwitch: (mode: SourceMode) => void;
  className?: string;
};

export const ReplayControls: FC<ReplayControlsProps> = ({
  mode,
  state,
  speed,
  currentIndex = 0,
  totalEvents = 0,
  onPlay,
  onPause,
  onResume,
  onReset,
  onSpeedChange,
  onModeSwitch,
  className = '',
}) => {
  const displayedTotal = Math.max(currentIndex, totalEvents);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border border-border bg-surface px-4 py-2.5 rounded shadow-sm ${className}`}
      role="region"
      aria-label="Replay Controls"
    >
      <div className="flex items-center gap-3">
        {/* Source Mode Toggle */}
        <div className="flex items-center rounded border border-border p-0.5 bg-surface-subtle">
          <button
            type="button"
            onClick={() => onModeSwitch('replay')}
            className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
              mode === 'replay'
                ? 'bg-foreground text-background shadow-xs font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Replay
          </button>
          <button
            type="button"
            onClick={() => onModeSwitch('live')}
            className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
              mode === 'live'
                ? 'bg-foreground text-background shadow-xs font-semibold'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Live WebSocket
          </button>
        </div>

        {/* State Badge */}
        {mode === 'replay' ? (
          <Badge
            variant={
              state === 'playing'
                ? 'success'
                : state === 'paused'
                ? 'warning'
                : state === 'completed'
                ? 'info'
                : 'neutral'
            }
          >
            {state === 'playing' && 'Playing'}
            {state === 'paused' && 'Paused'}
            {state === 'completed' && 'Completed'}
            {state === 'idle' && 'Ready'}
          </Badge>
        ) : (
          <Badge variant="neutral">Live Mode</Badge>
        )}

        {/* Counter */}
        {mode === 'replay' && displayedTotal > 0 && (
          <span className="text-xs text-foreground-muted font-mono">
            {currentIndex} / {displayedTotal} events
          </span>
        )}
      </div>

      {mode === 'replay' && (
        <div className="flex items-center gap-2">
          {/* Play / Pause / Resume */}
          {state === 'idle' && (
            <button
              type="button"
              onClick={onPlay}
              className="rounded border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-subtle focus:outline-none focus:ring-2 focus:ring-border"
            >
              Start Replay
            </button>
          )}

          {state === 'playing' && (
            <button
              type="button"
              onClick={onPause}
              className="rounded border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-subtle focus:outline-none focus:ring-2 focus:ring-border"
            >
              Pause
            </button>
          )}

          {state === 'paused' && (
            <button
              type="button"
              onClick={onResume}
              className="rounded border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-subtle focus:outline-none focus:ring-2 focus:ring-border"
            >
              Resume
            </button>
          )}

          {/* Reset */}
          <button
            type="button"
            onClick={onReset}
            className="rounded border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-subtle focus:outline-none focus:ring-2 focus:ring-border"
          >
            Reset
          </button>

          {/* Speed Selector */}
          <div className="ml-2 flex items-center gap-1 border-l border-border pl-3">
            <span className="text-xs text-foreground-muted">Speed:</span>
            {REPLAY_SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSpeedChange(s)}
                className={`rounded px-1.5 py-0.5 text-xs font-mono transition-colors ${
                  speed === s
                    ? 'bg-foreground text-background font-semibold'
                    : 'text-foreground-muted hover:bg-surface-subtle'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
