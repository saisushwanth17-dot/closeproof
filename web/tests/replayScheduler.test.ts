import { describe, it, expect, vi } from 'vitest';
import { ReplayScheduler, type Clock } from '@/lib/adapter/replayScheduler';
import type { TelemetryEvent } from '@/lib/contracts/contractC';

describe('ReplayScheduler', () => {
  const createMockClock = () => {
    let currentTime = 1000;
    const timers = new Map<number, { fn: () => void; due: number }>();
    let nextId = 1;

    const clock: Clock = {
      now: () => currentTime,
      setTimeout: (fn, ms) => {
        const id = nextId++;
        timers.set(id, { fn, due: currentTime + ms });
        return id;
      },
      clearTimeout: (id) => {
        timers.delete(id as number);
      },
    };

    const advanceBy = (ms: number) => {
      currentTime += ms;
      const ready: Array<{ id: number; fn: () => void }> = [];
      timers.forEach((timer, id) => {
        if (timer.due <= currentTime) {
          ready.push({ id, fn: timer.fn });
        }
      });
      for (const { id, fn } of ready) {
        timers.delete(id);
        fn();
      }
    };

    return { clock, advanceBy, getPendingCount: () => timers.size };
  };

  const sampleEvents: TelemetryEvent[] = [
    { project: 'closeproof', event: 'feed_ingested', severity: 'info', ts: 1000, payload: { count: 1 } },
    { project: 'closeproof', event: 'recon_match', severity: 'info', ts: 1500, payload: { id: 'm1' } },
    { project: 'closeproof', event: 'recon_exception', severity: 'warn', ts: 2000, payload: { id: 'e1' } },
  ];

  it('plays events deterministically in order with virtual clock', () => {
    const { clock, advanceBy } = createMockClock();
    const scheduler = new ReplayScheduler(sampleEvents, clock);
    const emitted: string[] = [];

    scheduler.onEvent((event) => {
      emitted.push(event.event);
    });

    scheduler.play();
    // First event emitted synchronously upon play
    expect(emitted).toEqual(['feed_ingested']);
    expect(scheduler.getState()).toBe('playing');

    // Advance clock past the gap (500ms / 1x = 500ms)
    advanceBy(500);
    expect(emitted).toEqual(['feed_ingested', 'recon_match']);

    // Advance clock past the next gap (500ms)
    advanceBy(500);
    expect(emitted).toEqual(['feed_ingested', 'recon_match', 'recon_exception']);
    expect(scheduler.getState()).toBe('completed');
  });

  it('supports pause and resume without skipping events', () => {
    const { clock, advanceBy } = createMockClock();
    const scheduler = new ReplayScheduler(sampleEvents, clock);
    const emitted: string[] = [];

    scheduler.onEvent((event) => {
      emitted.push(event.event);
    });

    scheduler.play();
    expect(emitted).toEqual(['feed_ingested']);

    // Advance 250ms (halfway to event 2) and pause
    advanceBy(250);
    scheduler.pause();
    expect(scheduler.getState()).toBe('paused');

    // Time passing while paused should NOT emit anything
    advanceBy(1000);
    expect(emitted).toEqual(['feed_ingested']);

    // Resume should emit after remaining 250ms
    scheduler.resume();
    expect(scheduler.getState()).toBe('playing');
    advanceBy(250);
    expect(emitted).toEqual(['feed_ingested', 'recon_match']);
  });

  it('rescales delay when speed multiplier is changed mid-play', () => {
    const { clock, advanceBy } = createMockClock();
    const scheduler = new ReplayScheduler(sampleEvents, clock);
    const emitted: string[] = [];

    scheduler.onEvent((event) => {
      emitted.push(event.event);
    });

    scheduler.play();
    expect(emitted).toEqual(['feed_ingested']);

    // Change to 2x speed
    scheduler.setSpeed(2);
    // 500ms gap at 2x takes 250ms
    advanceBy(250);
    expect(emitted).toEqual(['feed_ingested', 'recon_match']);
  });

  it('resets back to idle and initial state', () => {
    const { clock, advanceBy } = createMockClock();
    const scheduler = new ReplayScheduler(sampleEvents, clock);
    const emitted: string[] = [];

    scheduler.onEvent((event) => {
      emitted.push(event.event);
    });

    scheduler.play();
    advanceBy(500);
    expect(emitted).toHaveLength(2);

    scheduler.reset();
    expect(scheduler.getState()).toBe('idle');
    expect(scheduler.getCurrentIndex()).toBe(0);
  });
});
