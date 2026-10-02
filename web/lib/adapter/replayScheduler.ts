import type { TelemetryEvent } from '@/lib/contracts/contractC';
import { REPLAY_MAX_GAP_MS, type ReplaySpeed, type ReplayState } from '@/lib/constants';

export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
  now(): number;
}

export const defaultClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  now: () => Date.now(),
};

export type EventSchedulerCallback = (event: TelemetryEvent, index: number, total: number) => void;
export type StateSchedulerCallback = (state: ReplayState) => void;

export class ReplayScheduler {
  private events: TelemetryEvent[];
  private clock: Clock;
  private currentIndex = 0;
  private state: ReplayState = 'idle';
  private speed: ReplaySpeed = 1;
  private timerId: unknown = null;
  private nextEventScheduledTime: number | null = null;
  private remainingDelayMs = 0;

  private onEventCallback: EventSchedulerCallback | null = null;
  private onStateCallback: StateSchedulerCallback | null = null;

  constructor(events: TelemetryEvent[], clock: Clock = defaultClock) {
    this.events = events;
    this.clock = clock;
  }

  public getState(): ReplayState {
    return this.state;
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getSpeed(): ReplaySpeed {
    return this.speed;
  }

  public onEvent(cb: EventSchedulerCallback): void {
    this.onEventCallback = cb;
  }

  public onStateChange(cb: StateSchedulerCallback): void {
    this.onStateCallback = cb;
    cb(this.state);
  }

  private setState(newState: ReplayState): void {
    this.state = newState;
    this.onStateCallback?.(newState);
  }

  public setSpeed(newSpeed: ReplaySpeed): void {
    if (this.speed === newSpeed) return;
    const oldSpeed = this.speed;
    this.speed = newSpeed;

    // If currently waiting for the next event, rescale remaining delay
    if (this.state === 'playing' && this.timerId !== null && this.nextEventScheduledTime !== null) {
      this.clock.clearTimeout(this.timerId);
      const elapsed = this.clock.now() - (this.nextEventScheduledTime - this.remainingDelayMs);
      const remainingOld = Math.max(0, this.remainingDelayMs - elapsed);
      // Adjust remaining by speed ratio
      const adjustedDelay = (remainingOld * oldSpeed) / newSpeed;
      this.scheduleNext(adjustedDelay);
    }
  }

  public play(): void {
    if (this.events.length === 0) {
      this.setState('completed');
      return;
    }

    if (this.state === 'playing') return;

    if (this.state === 'paused') {
      this.resume();
      return;
    }

    // Starting from idle or beginning
    this.currentIndex = 0;
    this.setState('playing');
    this.emitCurrentAndScheduleNext();
  }

  public pause(): void {
    if (this.state !== 'playing') return;

    if (this.timerId !== null) {
      this.clock.clearTimeout(this.timerId);
      this.timerId = null;
      if (this.nextEventScheduledTime !== null) {
        this.remainingDelayMs = Math.max(0, this.nextEventScheduledTime - this.clock.now());
      }
    }
    this.setState('paused');
  }

  public resume(): void {
    if (this.state !== 'paused') return;

    this.setState('playing');
    if (this.remainingDelayMs > 0) {
      this.scheduleNext(this.remainingDelayMs);
    } else {
      this.emitCurrentAndScheduleNext();
    }
  }

  public reset(): void {
    if (this.timerId !== null) {
      this.clock.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.currentIndex = 0;
    this.remainingDelayMs = 0;
    this.nextEventScheduledTime = null;
    this.setState('idle');
  }

  private computeDelay(prevEvent: TelemetryEvent, nextEvent: TelemetryEvent): number {
    const rawGap = Math.max(0, nextEvent.ts - prevEvent.ts);
    // Clamp to [100ms min, REPLAY_MAX_GAP_MS max] so playback feels responsive and steady
    const clampedGap = Math.min(Math.max(rawGap, 100), REPLAY_MAX_GAP_MS);
    return clampedGap / this.speed;
  }

  private scheduleNext(delayMs: number): void {
    this.remainingDelayMs = delayMs;
    this.nextEventScheduledTime = this.clock.now() + delayMs;

    this.timerId = this.clock.setTimeout(() => {
      this.timerId = null;
      this.nextEventScheduledTime = null;
      this.remainingDelayMs = 0;
      this.emitCurrentAndScheduleNext();
    }, delayMs);
  }

  private emitCurrentAndScheduleNext(): void {
    if (this.currentIndex >= this.events.length) {
      this.setState('completed');
      return;
    }

    const event = this.events[this.currentIndex];
    this.onEventCallback?.(event, this.currentIndex, this.events.length);
    this.currentIndex += 1;

    if (this.currentIndex >= this.events.length) {
      this.setState('completed');
      return;
    }

    const nextEvent = this.events[this.currentIndex];
    const delay = this.computeDelay(event, nextEvent);
    this.scheduleNext(delay);
  }
}
