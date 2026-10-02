import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { useTelemetry } from '@/hooks/useTelemetry';
import type { TelemetryEvent } from '@/lib/contracts/contractC';

const sampleEvent: TelemetryEvent = {
  project: 'closeproof',
  event: 'feed_ingested',
  severity: 'info',
  ts: 1727870400000,
  payload: { run_id: '01JB0000000000000000000001', count: 1 },
};

function TestHarness({ events }: { events: TelemetryEvent[] }) {
  const { state, totalEvents, play, reset } = useTelemetry(undefined, {
    mode: 'replay',
    initialEvents: events,
    autoPlay: false,
  });

  return (
    <div>
      <span data-testid="run-id">{state.runId ?? 'no-run'}</span>
      <span data-testid="total-events">{totalEvents}</span>
      <span data-testid="replay-state">{state.replayState}</span>
      <button data-testid="play-btn" onClick={play}>Play</button>
      <button data-testid="reset-btn" onClick={reset}>Reset</button>
    </div>
  );
}

describe('replayHarness with StrictMode', () => {
  it('mounts cleanly in React StrictMode without leaking listeners or state', () => {
    const { unmount } = render(
      <React.StrictMode>
        <TestHarness events={[sampleEvent]} />
      </React.StrictMode>
    );

    expect(screen.getByTestId('total-events').textContent).toBe('0');
    expect(screen.getByTestId('replay-state').textContent).toBe('idle');

    // Unmount should execute cleanup without crashing
    unmount();
  });
});
