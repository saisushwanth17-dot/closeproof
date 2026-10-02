// Contract C: Telemetry envelope (Owner: CP-4 schema, emitted by all)
// Frozen per CloseProof Squad Playbook
// Payload is Record<string, unknown> at the envelope level.
// Narrowing happens in the parser, not here.

export const ALLOWED_EVENTS = [
  'feed_ingested',
  'recon_match',
  'recon_exception',
  'evidence_attached',
  'tavily_lookup',
  'explain_done',
  'sandbox_result',
  'packet_ready',
] as const;

export type TelemetryEventName = (typeof ALLOWED_EVENTS)[number];

export type Severity = 'info' | 'warn' | 'error';

export type TelemetryEvent = {
  project: 'closeproof';
  event: TelemetryEventName;
  severity: Severity;
  ts: number;
  payload: Record<string, unknown>;
};

/**
 * Result of parsing a raw telemetry line.
 * Either a valid event or a parse error with the raw line preserved.
 */
export type ParseResult =
  | { ok: true; event: TelemetryEvent }
  | { ok: false; error: string; raw: string };

/**
 * Close state derived from the furthest stage reached by event order.
 */
export const CLOSE_STAGES = [
  'Waiting',
  'Ingesting',
  'Reconciling',
  'Investigating',
  'Explaining',
  'Analyzing',
  'Packet ready',
] as const;

export type CloseStage = (typeof CLOSE_STAGES)[number];

/**
 * Maps event names to the close stage they advance to.
 */
export const EVENT_TO_STAGE: Partial<Record<TelemetryEventName, CloseStage>> = {
  feed_ingested: 'Ingesting',
  recon_match: 'Reconciling',
  recon_exception: 'Reconciling',
  evidence_attached: 'Investigating',
  tavily_lookup: 'Investigating',
  explain_done: 'Explaining',
  sandbox_result: 'Analyzing',
  packet_ready: 'Packet ready',
};
