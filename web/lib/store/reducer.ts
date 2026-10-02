/**
 * Pure closeRoomReducer: builds cumulative reconciliation state from telemetry events.
 * Idempotent on duplicate events (keyed by item id).
 * Handles orphan events for items not yet seen.
 * Uses runtime type guards and authoritative item linkage resolver.
 *
 * This reducer processes ALL events — including those that have scrolled
 * out of the 500-event ring buffer (Store 1). Metrics are derived from
 * this cumulative state, never from the capped log.
 */

import type { TelemetryEvent } from '@/lib/contracts/contractC';
import { EVENT_TO_STAGE, CLOSE_STAGES, type CloseStage } from '@/lib/contracts/contractC';
import type { ReconItem, Evidence } from '@/lib/contracts/contractB';
import type { ExplanationDetails } from '@/lib/contracts/explanation';
import type { CloseRoomState, CloseRoomAction } from './types';
import {
  resolveAuthoritativeItemId,
  isEvidence,
  isEvidenceArray,
  isHumanAction,
} from '@/lib/contracts/guards';

export const INITIAL_STATE: CloseRoomState = {
  mode: 'replay',
  runId: null,
  stage: 'Waiting',
  matchedItems: {},
  exceptions: {},
  explanations: {},
  searches: [],
  orphanEvents: {},
  firstTs: null,
  lastTs: null,
  totalEventsProcessed: 0,
  malformedCount: 0,
  warningCount: 0,
  errorCount: 0,
  packetReady: false,
  packetSummary: null,
  demoActions: {},
  connectionState: 'disconnected',
  replayState: 'idle',
};

function advanceStage(current: CloseStage, eventName: string): CloseStage {
  const newStage = EVENT_TO_STAGE[eventName as keyof typeof EVENT_TO_STAGE];
  if (!newStage) return current;
  const currentIdx = CLOSE_STAGES.indexOf(current);
  const newIdx = CLOSE_STAGES.indexOf(newStage);
  return newIdx > currentIdx ? newStage : current;
}

function processEvent(state: CloseRoomState, event: TelemetryEvent): CloseRoomState {
  const { payload } = event;
  let next = { ...state };

  // Update timestamps
  if (next.firstTs === null) {
    next.firstTs = event.ts;
  }
  next.lastTs = event.ts;
  next.totalEventsProcessed += 1;

  // Update severity counts
  if (event.severity === 'warn') next.warningCount += 1;
  if (event.severity === 'error') next.errorCount += 1;

  // Advance close stage
  next.stage = advanceStage(next.stage, event.event);

  // Resolve run_id from payload if not yet set
  if (!next.runId && typeof payload.run_id === 'string' && payload.run_id.trim().length > 0) {
    next.runId = payload.run_id.trim();
  }

  switch (event.event) {
    case 'feed_ingested': {
      if (typeof payload.run_id === 'string' && payload.run_id.trim().length > 0) {
        next.runId = payload.run_id.trim();
      }
      break;
    }

    case 'recon_match': {
      const id = resolveAuthoritativeItemId(event);
      if (id) {
        const candidates: Evidence[] = isEvidenceArray(payload.candidates)
          ? payload.candidates
          : [];
        const citations: string[] = Array.isArray(payload.citations)
          ? (payload.citations as string[])
          : [];
        const item: ReconItem = {
          id,
          amount: typeof payload.amount === 'number' ? payload.amount : 0,
          status: 'matched',
          candidates,
          confidence: typeof payload.confidence === 'number' ? payload.confidence : 0,
          explanation: typeof payload.explanation === 'string' ? payload.explanation : null,
          citations,
          human_action: null,
        };
        next.matchedItems = { ...next.matchedItems, [id]: item };
        next = reconcileOrphans(next, id);
      }
      break;
    }

    case 'recon_exception': {
      const id = resolveAuthoritativeItemId(event);
      if (id) {
        const humanAction = isHumanAction(payload.human_action)
          ? payload.human_action
          : null;
        const candidates: Evidence[] = isEvidenceArray(payload.candidates)
          ? payload.candidates
          : [];
        const citations: string[] = Array.isArray(payload.citations)
          ? (payload.citations as string[])
          : [];
        const item: ReconItem = {
          id,
          amount: typeof payload.amount === 'number' ? payload.amount : 0,
          status: 'exception',
          candidates,
          confidence: typeof payload.confidence === 'number' ? payload.confidence : 0,
          explanation: typeof payload.explanation === 'string' ? payload.explanation : null,
          citations,
          human_action: humanAction,
        };
        next.exceptions = { ...next.exceptions, [id]: item };
        next = reconcileOrphans(next, id);
      }
      break;
    }

    case 'evidence_attached': {
      const itemId = resolveAuthoritativeItemId(event);
      if (itemId) {
        const targetItem = next.exceptions[itemId] || next.matchedItems[itemId];
        if (targetItem && isEvidence(payload.evidence)) {
          const evidence = payload.evidence;
          const updated = {
            ...targetItem,
            candidates: [...targetItem.candidates, evidence],
          };
          if (targetItem.status === 'exception') {
            next.exceptions = { ...next.exceptions, [itemId]: updated };
          } else {
            next.matchedItems = { ...next.matchedItems, [itemId]: updated };
          }
        } else if (!targetItem) {
          const existing = next.orphanEvents[itemId] || [];
          next.orphanEvents = {
            ...next.orphanEvents,
            [itemId]: [...existing, event],
          };
        }
      }
      break;
    }

    case 'tavily_lookup': {
      const query = typeof payload.query === 'string' ? payload.query : '';
      const urls = Array.isArray(payload.urls) ? (payload.urls as string[]) : [];
      const itemId = resolveAuthoritativeItemId(event);
      if (query) {
        next.searches = [...next.searches, { query, urls, itemId }];
      }
      break;
    }

    case 'explain_done': {
      const itemId = resolveAuthoritativeItemId(event);
      if (itemId) {
        const explanation: ExplanationDetails = {
          item_id: itemId,
          model_tier: payload.model_tier === 'nano' ? 'nano' : 'ultra',
          tokens: typeof payload.tokens === 'number' ? payload.tokens : undefined,
          latency_ms: typeof payload.latency_ms === 'number' ? payload.latency_ms : undefined,
          explanation: typeof payload.explanation === 'string' ? payload.explanation : '',
          missing_evidence: Array.isArray(payload.missing_evidence) ? (payload.missing_evidence as string[]) : [],
          candidate_scores: Array.isArray(payload.candidate_scores) ? (payload.candidate_scores as ExplanationDetails['candidate_scores']) : [],
          recommended_action: isHumanAction(payload.recommended_action)
            ? payload.recommended_action
            : null,
          confidence: typeof payload.confidence === 'number' ? payload.confidence : 0,
          citations: Array.isArray(payload.citations) ? (payload.citations as string[]) : [],
        };
        next.explanations = { ...next.explanations, [itemId]: explanation };
      }
      break;
    }

    case 'sandbox_result': {
      break;
    }

    case 'packet_ready': {
      next.packetReady = true;
      if (payload.summary && typeof payload.summary === 'object') {
        const summary = payload.summary as Record<string, unknown>;
        next.packetSummary = {
          matchedCount: typeof summary.matched_count === 'number' ? summary.matched_count : 0,
          exceptionCount: typeof summary.exception_count === 'number' ? summary.exception_count : 0,
          totalUnreconciledCents: typeof summary.total_unreconciled_cents === 'number'
            ? summary.total_unreconciled_cents
            : 0,
        };
      }
      break;
    }
  }

  return next;
}

/**
 * When a recon_match or recon_exception arrives, replay any orphan events
 * that were cached for that item_id.
 */
function reconcileOrphans(state: CloseRoomState, itemId: string): CloseRoomState {
  const orphans = state.orphanEvents[itemId];
  if (!orphans || orphans.length === 0) return state;

  let next = state;
  const remainingOrphans = { ...next.orphanEvents };
  delete remainingOrphans[itemId];
  next = { ...next, orphanEvents: remainingOrphans };

  // Replay each orphan event
  for (const orphanEvent of orphans) {
    next = processEvent(next, orphanEvent);
  }
  return next;
}

export function closeRoomReducer(
  state: CloseRoomState,
  action: CloseRoomAction
): CloseRoomState {
  switch (action.type) {
    case 'PROCESS_EVENT':
      return processEvent(state, action.event);

    case 'MALFORMED_LINE':
      return { ...state, malformedCount: state.malformedCount + 1 };

    case 'SET_RUN_ID':
      return { ...state, runId: action.runId };

    case 'SET_CONNECTION_STATE':
      return { ...state, connectionState: action.state };

    case 'SET_REPLAY_STATE':
      return { ...state, replayState: action.state };

    case 'SET_MODE':
      return { ...state, mode: action.mode };

    case 'RECORD_DEMO_ACTION':
      return {
        ...state,
        demoActions: { ...state.demoActions, [action.itemId]: action.action },
      };

    case 'RESET':
      return { ...INITIAL_STATE, mode: state.mode };

    default:
      return state;
  }
}
