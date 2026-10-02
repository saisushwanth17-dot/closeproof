/**
 * CloseProof Runtime Type Guards & Authoritative Item Linkage
 * 
 * Replaces unsafe type casts with runtime validation.
 * Enforces Contract B and Contract C invariants.
 */

import type { ReconItem, Evidence, HumanAction } from './contractB';
import { HUMAN_ACTIONS } from './contractB';
import type { TelemetryEvent } from './contractC';
import type { ExplanationDetails, CandidateScore } from './explanation';

/**
 * Authoritative Item Linkage Resolver
 * 
 * Resolves an explicit item identifier from a telemetry payload.
 * Checks recognized identifier fields without assuming a single hardcoded key.
 * 
 * Invariants:
 * - Returns a non-empty trimmed string if an explicit item ID exists.
 * - Returns null if no explicit ID exists or if value is empty/invalid.
 * - NEVER infers linkage from timestamps, sequence order, stream proximity, or amounts.
 */
export function resolveAuthoritativeItemId(event: TelemetryEvent): string | null {
  if (!event || !event.payload || typeof event.payload !== 'object') {
    return null;
  }

  const payload = event.payload;

  // Candidate identifier keys in order of precedence per contracts
  const candidateKeys = ['id', 'item_id', 'itemId', 'recon_item_id'];

  for (const key of candidateKeys) {
    const val = payload[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }

  return null;
}

export function isHumanAction(val: unknown): val is HumanAction {
  if (val === null) return true;
  return typeof val === 'string' && (HUMAN_ACTIONS as readonly string[]).includes(val);
}

export function isEvidence(val: unknown): val is Evidence {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.source === 'string' &&
    typeof obj.doc_id === 'string' &&
    typeof obj.field === 'string' &&
    typeof obj.value === 'string' &&
    (obj.url === null || typeof obj.url === 'string')
  );
}

export function isEvidenceArray(val: unknown): val is Evidence[] {
  return Array.isArray(val) && val.every(isEvidence);
}

export function isCandidateScore(val: unknown): val is CandidateScore {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.doc_id === 'string' &&
    typeof obj.score === 'number' &&
    typeof obj.why === 'string'
  );
}

export function isExplanationDetails(val: unknown): val is ExplanationDetails {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.item_id === 'string' &&
    (obj.model_tier === 'ultra' || obj.model_tier === 'nano') &&
    typeof obj.explanation === 'string' &&
    Array.isArray(obj.missing_evidence) &&
    Array.isArray(obj.candidate_scores) &&
    typeof obj.confidence === 'number' &&
    Array.isArray(obj.citations)
  );
}

export function isReconItem(val: unknown): val is ReconItem {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.amount === 'number' &&
    (obj.status === 'matched' || obj.status === 'exception') &&
    isEvidenceArray(obj.candidates) &&
    typeof obj.confidence === 'number' &&
    (obj.explanation === null || typeof obj.explanation === 'string') &&
    Array.isArray(obj.citations) &&
    isHumanAction(obj.human_action)
  );
}
