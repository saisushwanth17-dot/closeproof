// CloseProof application constants

/**
 * ASSUMPTION(G-7): ReconItem has no currency field.
 * Base currency used for all amount formatting.
 * Default USD until confirmed by CP-1.
 */
export const BASE_CURRENCY = 'USD';

/**
 * Maximum number of events retained in the view-only ring buffer (Store 1).
 * Events beyond this count are still processed by the reconciliation reducer (Store 2).
 */
export const EVENT_BUFFER_SIZE = 500;

/**
 * Maximum gap between consecutive replay events (ms).
 * Prevents long pauses in replay playback.
 */
export const REPLAY_MAX_GAP_MS = 2000;

/**
 * Available replay speed multipliers.
 */
export const REPLAY_SPEEDS = [0.5, 1, 2, 4] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

/**
 * Replay states.
 */
export const REPLAY_STATES = ['idle', 'playing', 'paused', 'completed'] as const;
export type ReplayState = (typeof REPLAY_STATES)[number];

/**
 * WebSocket connection states.
 */
export const CONNECTION_STATES = ['connecting', 'connected', 'reconnecting', 'disconnected', 'polling'] as const;
export type ConnectionState = (typeof CONNECTION_STATES)[number];

/**
 * Telemetry source modes.
 */
export const SOURCE_MODES = ['live', 'replay'] as const;
export type SourceMode = (typeof SOURCE_MODES)[number];

/**
 * Legal placeholder fields that must be replaced before production release.
 * Release status remains incomplete until the legal owner provides real values.
 */
export const LEGAL_PLACEHOLDERS = [
  'ENTITY_NAME',
  'ENTITY_ADDRESS',
  'CONTACT_EMAIL',
  'JURISDICTION',
] as const;
