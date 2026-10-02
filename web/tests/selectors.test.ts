import { describe, it, expect } from 'vitest';
import {
  selectMatchRate,
  selectUnreconciledCents,
  selectPendingActionsCount,
  selectRequiredActionsCount,
  selectDemoActionsCount,
  selectPacketDiscrepancy,
  selectEventDuration,
} from '@/lib/store/selectors';
import { INITIAL_STATE } from '@/lib/store/reducer';
import type { CloseRoomState } from '@/lib/store/types';

describe('selectors', () => {
  it('selectMatchRate returns null rate when 0 items (undefined rate)', () => {
    const result = selectMatchRate(INITIAL_STATE);
    expect(result.rate).toBeNull();
    expect(result.matched).toBe(0);
    expect(result.total).toBe(0);
  });

  it('selectMatchRate computes rate correctly when items present', () => {
    const state: CloseRoomState = {
      ...INITIAL_STATE,
      matchedItems: {
        item_1: { id: 'item_1', amount: 100, status: 'matched', candidates: [], confidence: 1, explanation: null, citations: [], human_action: null },
        item_2: { id: 'item_2', amount: 200, status: 'matched', candidates: [], confidence: 1, explanation: null, citations: [], human_action: null },
      },
      exceptions: {
        item_3: { id: 'item_3', amount: -147, status: 'exception', candidates: [], confidence: 0.8, explanation: null, citations: [], human_action: 'approve_match' },
      },
    };

    const result = selectMatchRate(state);
    expect(result.matched).toBe(2);
    expect(result.total).toBe(3);
    expect(result.rate).toBeCloseTo(2 / 3);
  });

  it('selectUnreconciledCents returns gross absolute sum of exception cents', () => {
    const state: CloseRoomState = {
      ...INITIAL_STATE,
      exceptions: {
        ex_1: { id: 'ex_1', amount: -147, status: 'exception', candidates: [], confidence: 0.9, explanation: null, citations: [], human_action: 'approve_match' },
        ex_2: { id: 'ex_2', amount: 50.25, status: 'exception', candidates: [], confidence: 0.8, explanation: null, citations: [], human_action: 'request_receipt' },
      },
    };

    // |-14700| + |5025| = 14700 + 5025 = 19725
    expect(selectUnreconciledCents(state)).toBe(19725);
  });

  it('selectPendingActionsCount counts non-null actions excluding demoActions', () => {
    const state: CloseRoomState = {
      ...INITIAL_STATE,
      exceptions: {
        ex_1: { id: 'ex_1', amount: -147, status: 'exception', candidates: [], confidence: 0.9, explanation: null, citations: [], human_action: 'approve_match' },
        ex_2: { id: 'ex_2', amount: 200, status: 'exception', candidates: [], confidence: 0.8, explanation: null, citations: [], human_action: 'request_receipt' },
        ex_3: { id: 'ex_3', amount: 10, status: 'exception', candidates: [], confidence: 0.7, explanation: null, citations: [], human_action: null },
      },
      demoActions: {
        ex_1: 'approve_match',
      },
    };

    expect(selectRequiredActionsCount(state)).toBe(2); // ex_1 and ex_2
    expect(selectDemoActionsCount(state)).toBe(1); // ex_1
    expect(selectPendingActionsCount(state)).toBe(1); // only ex_2 remains pending
  });

  it('selectPacketDiscrepancy detects discrepancy between packet summary and reduced totals', () => {
    const state: CloseRoomState = {
      ...INITIAL_STATE,
      matchedItems: {
        item_1: { id: 'item_1', amount: 100, status: 'matched', candidates: [], confidence: 1, explanation: null, citations: [], human_action: null },
      },
      exceptions: {
        ex_1: { id: 'ex_1', amount: -147, status: 'exception', candidates: [], confidence: 0.9, explanation: null, citations: [], human_action: 'approve_match' },
      },
      packetSummary: {
        matchedCount: 2, // mismatch! Reduced is 1
        exceptionCount: 1,
        totalUnreconciledCents: 14700,
      },
    };

    const discrepancy = selectPacketDiscrepancy(state);
    expect(discrepancy).not.toBeNull();
    expect(discrepancy?.reducedMatched).toBe(1);
    expect(discrepancy?.summaryMatched).toBe(2);
  });

  it('selectPacketDiscrepancy returns null when summary matches reduced totals', () => {
    const state: CloseRoomState = {
      ...INITIAL_STATE,
      matchedItems: {
        item_1: { id: 'item_1', amount: 100, status: 'matched', candidates: [], confidence: 1, explanation: null, citations: [], human_action: null },
      },
      exceptions: {
        ex_1: { id: 'ex_1', amount: -147, status: 'exception', candidates: [], confidence: 0.9, explanation: null, citations: [], human_action: 'approve_match' },
      },
      packetSummary: {
        matchedCount: 1,
        exceptionCount: 1,
        totalUnreconciledCents: 14700,
      },
    };

    expect(selectPacketDiscrepancy(state)).toBeNull();
  });

  it('selectEventDuration returns duration between first and last ts', () => {
    const state: CloseRoomState = {
      ...INITIAL_STATE,
      firstTs: 1000,
      lastTs: 7500,
    };
    expect(selectEventDuration(state)).toBe(6500);
  });
});
