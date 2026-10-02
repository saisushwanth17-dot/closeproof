/**
 * Centralized telemetry line parser.
 * Validates raw JSON lines against Contract C envelope.
 * Payload narrowing happens here, not at the type level.
 *
 * - Unknown event names are surfaced as warnings, never silently dropped.
 * - Malformed lines produce typed parse errors with the raw line preserved.
 * - Timestamps are normalized via normalizeTs().
 * - Confidence is validated as 0 <= x <= 1 (no formula step enforcement).
 * - IDs are accepted as non-empty strings in production.
 */

import {
  ALLOWED_EVENTS,
  type TelemetryEvent,
  type TelemetryEventName,
  type ParseResult,
  type Severity,
} from '@/lib/contracts/contractC';
import { normalizeTs } from '@/lib/formatters';

const ALLOWED_SET = new Set<string>(ALLOWED_EVENTS);
const VALID_SEVERITIES = new Set<string>(['info', 'warn', 'error']);

/**
 * Parses a single raw line into a validated TelemetryEvent or an error result.
 */
export function parseTelemetryLine(raw: string): ParseResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'Empty line', raw };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'Invalid JSON', raw };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'Not a JSON object', raw };
  }

  const obj = parsed as Record<string, unknown>;

  // Validate project field
  if (obj.project !== 'closeproof') {
    return {
      ok: false,
      error: `Invalid project: expected "closeproof", got "${String(obj.project)}"`,
      raw,
    };
  }

  // Validate event name
  if (typeof obj.event !== 'string') {
    return { ok: false, error: 'Missing or non-string event field', raw };
  }

  if (!ALLOWED_SET.has(obj.event)) {
    return {
      ok: false,
      error: `Unknown event name: "${obj.event}". Allowed: ${ALLOWED_EVENTS.join(', ')}`,
      raw,
    };
  }

  // Validate severity
  if (typeof obj.severity !== 'string' || !VALID_SEVERITIES.has(obj.severity)) {
    return {
      ok: false,
      error: `Invalid severity: "${String(obj.severity)}". Must be info, warn, or error`,
      raw,
    };
  }

  // Validate timestamp
  if (typeof obj.ts !== 'number' || !isFinite(obj.ts) || obj.ts <= 0) {
    return {
      ok: false,
      error: `Invalid timestamp: ${String(obj.ts)}`,
      raw,
    };
  }

  // Validate payload
  if (typeof obj.payload !== 'object' || obj.payload === null || Array.isArray(obj.payload)) {
    return {
      ok: false,
      error: 'Missing or invalid payload (must be a JSON object)',
      raw,
    };
  }

  // Validate confidence if present in payload (0 <= x <= 1)
  const payload = obj.payload as Record<string, unknown>;
  if ('confidence' in payload) {
    const conf = payload.confidence;
    if (typeof conf !== 'number' || conf < 0 || conf > 1) {
      return {
        ok: false,
        error: `Invalid confidence: ${String(conf)}. Must be between 0 and 1`,
        raw,
      };
    }
  }

  const event: TelemetryEvent = {
    project: 'closeproof',
    event: obj.event as TelemetryEventName,
    severity: obj.severity as Severity,
    ts: normalizeTs(obj.ts),
    payload: payload,
  };

  return { ok: true, event };
}

/**
 * Parses multiple lines (e.g. from a JSONL file).
 * Returns all results including errors for surfacing malformed line counts.
 */
export function parseTelemetryLines(text: string): ParseResult[] {
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map(parseTelemetryLine);
}
