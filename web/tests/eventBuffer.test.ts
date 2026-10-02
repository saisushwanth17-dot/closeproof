import { describe, it, expect } from 'vitest';
import {
  createEventBuffer,
  pushEvent,
  resetBuffer,
  getVisibleEvents,
} from '@/lib/store/eventBuffer';
import { closeRoomReducer, INITIAL_STATE } from '@/lib/store/reducer';
import type { TelemetryEvent } from '@/lib/contracts/contractC';

describe('eventBuffer', () => {
  it('initializes empty', () => {
    const buffer = createEventBuffer();
    expect(buffer.events).toHaveLength(0);
    expect(buffer.totalPushed).toBe(0);
  });

  it('retains up to 500 events in FIFO order', () => {
    let buffer = createEventBuffer();

    for (let i = 0; i < 500; i++) {
      const event: TelemetryEvent = {
        project: 'closeproof',
        event: 'feed_ingested',
        severity: 'info',
        ts: 1000 + i,
        payload: { count: i },
      };
      buffer = pushEvent(buffer, event);
    }

    expect(buffer.events).toHaveLength(500);
    expect(buffer.totalPushed).toBe(500);
    expect(buffer.events[0].ts).toBe(1000);
    expect(buffer.events[499].ts).toBe(1499);
  });

  it('evicts oldest event when exceeding 500 items', () => {
    let buffer = createEventBuffer();

    for (let i = 0; i < 502; i++) {
      const event: TelemetryEvent = {
        project: 'closeproof',
        event: 'feed_ingested',
        severity: 'info',
        ts: 1000 + i,
        payload: { count: i },
      };
      buffer = pushEvent(buffer, event);
    }

    // Buffer capped at 500
    expect(buffer.events).toHaveLength(500);
    // Total count tracks all 502
    expect(buffer.totalPushed).toBe(502);
    // Oldest 2 events evicted: first visible is i=2 (ts=1002)
    expect(buffer.events[0].ts).toBe(1002);
    expect(buffer.events[499].ts).toBe(1501);
  });

  it('resets buffer correctly', () => {
    let buffer = createEventBuffer();
    buffer = pushEvent(buffer, {
      project: 'closeproof',
      event: 'feed_ingested',
      severity: 'info',
      ts: 1000,
      payload: {},
    });
    buffer = resetBuffer();
    expect(buffer.events).toHaveLength(0);
    expect(buffer.totalPushed).toBe(0);
  });

  it('stress test: 600 events retain 500 in buffer while reducer counts all 600', () => {
    let buffer = createEventBuffer();
    let state = INITIAL_STATE;

    for (let i = 0; i < 600; i++) {
      const event: TelemetryEvent = {
        project: 'closeproof',
        event: 'feed_ingested',
        severity: 'info',
        ts: 1000 + i * 10,
        payload: {
          run_id: '01JB0000000000000000000000',
          count: i,
        },
      };

      // Push to Store 1 (capped ring buffer)
      buffer = pushEvent(buffer, event);
      // Process in Store 2 (cumulative reducer)
      state = closeRoomReducer(state, { type: 'PROCESS_EVENT', event });
    }

    // Store 1: exactly 500 retained
    expect(getVisibleEvents(buffer)).toHaveLength(500);
    expect(buffer.totalPushed).toBe(600);

    // Store 2: processed all 600 events
    expect(state.totalEventsProcessed).toBe(600);
    expect(state.firstTs).toBe(1000);
    expect(state.lastTs).toBe(1000 + 599 * 10);
  });
});
