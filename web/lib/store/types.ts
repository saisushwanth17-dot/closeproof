/**
 * State types for the CloseProof dual-store architecture.
 *
 * Store 1: Capped ring buffer (latest 500 events) for the telemetry log view.
 * Store 2: Cumulative reconciliation state reduced from ALL events.
 */

import type { TelemetryEvent, CloseStage } from '@/lib/contracts/contractC';
import type { ReconItem, HumanAction } from '@/lib/contracts/contractB';
import type { ExplanationDetails } from '@/lib/contracts/explanation';
import type { ConnectionState, ReplayState, SourceMode } from '@/lib/constants';

/** Store 2: Full reconciliation state */
export type CloseRoomState = {
  /** Mode: live WebSocket or deterministic replay */
  mode: SourceMode;

  /** Run identifier resolved from payload or manifest */
  runId: string | null;

  /** Close processing stage derived from event order */
  stage: CloseStage;

  /** Matched items keyed by id */
  matchedItems: Record<string, ReconItem>;

  /** Exception items keyed by id */
  exceptions: Record<string, ReconItem>;

  /** CP-2 explanations keyed by item_id */
  explanations: Record<string, ExplanationDetails>;

  /** Tavily search queries linked to items */
  searches: Array<{
    query: string;
    urls: string[];
    itemId: string | null;
  }>;

  /** Orphan events for item IDs not yet seen */
  orphanEvents: Record<string, TelemetryEvent[]>;

  /** Timestamp of the first event (epoch ms, normalized) */
  firstTs: number | null;

  /** Timestamp of the most recent event (epoch ms, normalized) */
  lastTs: number | null;

  /** Total events processed (including those scrolled out of ring buffer) */
  totalEventsProcessed: number;

  /** Count of malformed / rejected lines */
  malformedCount: number;

  /** Warning-severity event count */
  warningCount: number;

  /** Error-severity event count */
  errorCount: number;

  /** Whether packet_ready has been received */
  packetReady: boolean;

  /** Summary from packet_ready payload, if present */
  packetSummary: {
    matchedCount: number;
    exceptionCount: number;
    totalUnreconciledCents: number;
  } | null;

  /** Local demo actions (replay only, never claimed as ledger changes) */
  demoActions: Record<string, HumanAction>;

  /** WebSocket connection state (live mode) */
  connectionState: ConnectionState;

  /** Replay playback state */
  replayState: ReplayState;
};

/** Action types for the reconciliation reducer */
export type CloseRoomAction =
  | { type: 'PROCESS_EVENT'; event: TelemetryEvent }
  | { type: 'MALFORMED_LINE' }
  | { type: 'SET_RUN_ID'; runId: string }
  | { type: 'SET_CONNECTION_STATE'; state: ConnectionState }
  | { type: 'SET_REPLAY_STATE'; state: ReplayState }
  | { type: 'SET_MODE'; mode: SourceMode }
  | { type: 'RECORD_DEMO_ACTION'; itemId: string; action: HumanAction }
  | { type: 'RESET' };
