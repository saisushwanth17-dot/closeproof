/**
 * Store 1: Capped ring buffer for the telemetry log view.
 *
 * Retains the latest EVENT_BUFFER_SIZE events for rendering in the
 * real-time event log. Events that scroll out are NOT lost: they have
 * already been processed by the cumulative reducer (Store 2).
 *
 * This is a pure data structure — no React state involved.
 */

import type { TelemetryEvent } from '@/lib/contracts/contractC';
import { EVENT_BUFFER_SIZE } from '@/lib/constants';

export type EventBuffer = {
  /** Ring storage. Always sorted by arrival order. */
  events: TelemetryEvent[];
  /** Total events ever pushed (not just the retained ones) */
  totalPushed: number;
};

export function createEventBuffer(): EventBuffer {
  return { events: [], totalPushed: 0 };
}

/**
 * Push a new event into the buffer. If the buffer exceeds
 * EVENT_BUFFER_SIZE, the oldest event is evicted.
 * Returns a new buffer (immutable).
 */
export function pushEvent(buffer: EventBuffer, event: TelemetryEvent): EventBuffer {
  const events =
    buffer.events.length >= EVENT_BUFFER_SIZE
      ? [...buffer.events.slice(1), event]
      : [...buffer.events, event];

  return {
    events,
    totalPushed: buffer.totalPushed + 1,
  };
}

/**
 * Reset the buffer to empty.
 */
export function resetBuffer(): EventBuffer {
  return createEventBuffer();
}

/**
 * Get the visible events (most recent EVENT_BUFFER_SIZE).
 */
export function getVisibleEvents(buffer: EventBuffer): readonly TelemetryEvent[] {
  return buffer.events;
}
