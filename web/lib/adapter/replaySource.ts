import type { TelemetrySource, EventCallback, MalformedCallback, StateCallback } from './telemetrySource';
import type { TelemetryEvent } from '@/lib/contracts/contractC';
import type { ReplaySpeed, ReplayState } from '@/lib/constants';
import { ReplayScheduler, type Clock } from './replayScheduler';

export class ReplaySource implements TelemetrySource {
  private scheduler: ReplayScheduler;
  private eventListeners: Set<EventCallback> = new Set();
  private malformedListeners: Set<MalformedCallback> = new Set();
  private stateListeners: Set<StateCallback> = new Set();

  constructor(events: TelemetryEvent[], clock?: Clock) {
    this.scheduler = new ReplayScheduler(events, clock);

    this.scheduler.onEvent((event) => {
      this.eventListeners.forEach((listener) => listener(event));
    });

    this.scheduler.onStateChange((state) => {
      this.stateListeners.forEach((listener) => listener(state));
    });
  }

  public connect(): void {
    // In replay mode, connecting starts playback
    this.scheduler.play();
  }

  public disconnect(): void {
    this.scheduler.pause();
  }

  public play(): void {
    this.scheduler.play();
  }

  public pause(): void {
    this.scheduler.pause();
  }

  public resume(): void {
    this.scheduler.resume();
  }

  public reset(): void {
    this.scheduler.reset();
  }

  public setSpeed(speed: ReplaySpeed): void {
    this.scheduler.setSpeed(speed);
  }

  public getState(): ReplayState {
    return this.scheduler.getState();
  }

  public getCurrentIndex(): number {
    return this.scheduler.getCurrentIndex();
  }

  public onEvent(callback: EventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  public onMalformed(callback: MalformedCallback): () => void {
    this.malformedListeners.add(callback);
    return () => this.malformedListeners.delete(callback);
  }

  public onStateChange(callback: StateCallback): () => void {
    this.stateListeners.add(callback);
    callback(this.scheduler.getState());
    return () => this.stateListeners.delete(callback);
  }
}
