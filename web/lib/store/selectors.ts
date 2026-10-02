/**
 * Pure selectors for CloseRoom reconciliation state.
 * Metrics are derived from Store 2 (cumulative), never from the capped ring buffer.
 * All computations use integer cents to avoid float drift.
 */

import type { CloseRoomState } from './types';
import { dollarsToCents } from '@/lib/formatters';

/**
 * Match rate: matchedCount / (matchedCount + exceptionCount).
 * Returns null when no items exist (0/0 is undefined; UI shows "--").
 */
export function selectMatchRate(state: CloseRoomState): {
  matched: number;
  total: number;
  rate: number | null;
} {
  const matched = Object.keys(state.matchedItems).length;
  const exceptions = Object.keys(state.exceptions).length;
  const total = matched + exceptions;

  if (total === 0) {
    return { matched: 0, total: 0, rate: null };
  }

  return {
    matched,
    total,
    rate: matched / total,
  };
}

/**
 * Gross unreconciled amount in integer cents.
 * Sum of absolute value of each exception item's amount.
 * Defined strictly as gross absolute sum: sum(|cents|).
 */
export function selectUnreconciledCents(state: CloseRoomState): number {
  return Object.values(state.exceptions).reduce(
    (acc, item) => acc + Math.abs(dollarsToCents(item.amount)),
    0
  );
}

/**
 * Count of exceptions with non-null human_action that have NOT been
 * recorded as demo actions.
 */
export function selectPendingActionsCount(state: CloseRoomState): number {
  return Object.values(state.exceptions).filter(
    (item) => item.human_action !== null && !(item.id in state.demoActions)
  ).length;
}

/**
 * Count of exceptions with required human_action (non-null), regardless of demo actions.
 */
export function selectRequiredActionsCount(state: CloseRoomState): number {
  return Object.values(state.exceptions).filter(
    (item) => item.human_action !== null
  ).length;
}

/**
 * Count of locally recorded demo actions.
 */
export function selectDemoActionsCount(state: CloseRoomState): number {
  return Object.keys(state.demoActions).length;
}

/**
 * Current close stage.
 */
export function selectCloseStage(state: CloseRoomState) {
  return state.stage;
}

/**
 * Whether the explanation is available for an item (from ReconItem or explain_done).
 */
export function selectExplanationAvailable(
  state: CloseRoomState,
  itemId: string
): boolean {
  const item = state.exceptions[itemId] || state.matchedItems[itemId];
  const explanation = state.explanations[itemId];
  return Boolean(item?.explanation || explanation?.explanation);
}

/**
 * Whether packet_ready summary disagrees with reduced totals.
 * Returns a discrepancy object if they differ, null if they match or no summary.
 */
export function selectPacketDiscrepancy(state: CloseRoomState): {
  reducedMatched: number;
  reducedExceptions: number;
  reducedUnreconciledCents: number;
  summaryMatched: number;
  summaryExceptions: number;
  summaryUnreconciledCents: number;
} | null {
  if (!state.packetSummary) return null;

  const reducedMatched = Object.keys(state.matchedItems).length;
  const reducedExceptions = Object.keys(state.exceptions).length;
  const reducedUnreconciledCents = selectUnreconciledCents(state);

  const { matchedCount, exceptionCount, totalUnreconciledCents } = state.packetSummary;

  if (
    reducedMatched !== matchedCount ||
    reducedExceptions !== exceptionCount ||
    reducedUnreconciledCents !== totalUnreconciledCents
  ) {
    return {
      reducedMatched,
      reducedExceptions,
      reducedUnreconciledCents,
      summaryMatched: matchedCount,
      summaryExceptions: exceptionCount,
      summaryUnreconciledCents: totalUnreconciledCents,
    };
  }

  return null;
}

/**
 * Duration in milliseconds between first and last event timestamps.
 * Returns 0 if fewer than 2 events received.
 */
export function selectEventDuration(state: CloseRoomState): number {
  if (state.firstTs === null || state.lastTs === null) return 0;
  return state.lastTs - state.firstTs;
}
