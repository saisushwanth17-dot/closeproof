/**
 * TelemetrySource abstraction for CloseProof.
 *
 * Both WebSocketSource (live stream) and ReplaySource (deterministic replay)
 * implement this unified interface. Both emit raw lines or validated events
 * through identical parsing and reduction pipelines.
 */

import type { TelemetryEvent } from '@/lib/contracts/contractC';
import type { ConnectionState, ReplayState } from '@/lib/constants';

export type EventCallback = (event: TelemetryEvent) => void;
export type MalformedCallback = (error: string, raw: string) => void;
export type StateCallback = (state: ConnectionState | ReplayState) => void;

export interface TelemetrySource {
  connect(): void;
  disconnect(): void;
  onEvent(callback: EventCallback): () => void;
  onMalformed(callback: MalformedCallback): () => void;
  onStateChange(callback: StateCallback): () => void;
}
