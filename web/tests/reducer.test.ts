import { describe, it, expect } from 'vitest';
import { closeRoomReducer, INITIAL_STATE } from '@/lib/store/reducer';
import type { TelemetryEvent } from '@/lib/contracts/contractC';

describe('closeRoomReducer', () => {
  it('processes feed_ingested and sets runId and stage', () => {
    const event: TelemetryEvent = {
      project: 'closeproof',
      event: 'feed_ingested',
      severity: 'info',
      ts: 1727870400000,
      payload: {
        run_id: '01JB0000000000000000000000',
        count: 50,
      },
    };

    const state = closeRoomReducer(INITIAL_STATE, { type: 'PROCESS_EVENT', event });
    expect(state.runId).toBe('01JB0000000000000000000000');
    expect(state.stage).toBe('Ingesting');
    expect(state.firstTs).toBe(1727870400000);
    expect(state.lastTs).toBe(1727870400000);
    expect(state.totalEventsProcessed).toBe(1);
  });

  it('records matched items and is idempotent', () => {
    const event: TelemetryEvent = {
      project: 'closeproof',
      event: 'recon_match',
      severity: 'info',
      ts: 1727870401000,
      payload: {
        id: 'rec_01',
        amount: 250,
        status: 'matched',
        candidates: [],
        confidence: 0.9,
        explanation: 'Direct invoice match',
        citations: [],
        human_action: null,
      },
    };

    let state = closeRoomReducer(INITIAL_STATE, { type: 'PROCESS_EVENT', event });
    expect(Object.keys(state.matchedItems)).toHaveLength(1);
    expect(state.matchedItems['rec_01'].confidence).toBe(0.9);

    // Replay duplicate event
    state = closeRoomReducer(state, { type: 'PROCESS_EVENT', event });
    expect(Object.keys(state.matchedItems)).toHaveLength(1);
    expect(state.totalEventsProcessed).toBe(2);
  });

  it('records exception items with human_action and advances stage', () => {
    const event: TelemetryEvent = {
      project: 'closeproof',
      event: 'recon_exception',
      severity: 'warn',
      ts: 1727870402000,
      payload: {
        id: 'rec_147',
        amount: -147,
        status: 'exception',
        candidates: [],
        confidence: 0.88,
        explanation: 'Unrecorded bank fee',
        citations: [],
        human_action: 'approve_match',
      },
    };

    const state = closeRoomReducer(INITIAL_STATE, { type: 'PROCESS_EVENT', event });
    expect(Object.keys(state.exceptions)).toHaveLength(1);
    expect(state.exceptions['rec_147'].human_action).toBe('approve_match');
    expect(state.warningCount).toBe(1);
    expect(state.stage).toBe('Reconciling');
  });

  it('caches orphan evidence_attached events and reconciles them when item arrives', () => {
    // 1. Evidence event arrives BEFORE the item
    const evidenceEvent: TelemetryEvent = {
      project: 'closeproof',
      event: 'evidence_attached',
      severity: 'info',
      ts: 1727870401000,
      payload: {
        item_id: 'rec_future',
        evidence: {
          source: 'stripe',
          doc_id: 'ch_123',
          field: 'fee',
          value: '$147.00',
          url: null,
        },
      },
    };

    let state = closeRoomReducer(INITIAL_STATE, { type: 'PROCESS_EVENT', event: evidenceEvent });
    expect(state.orphanEvents['rec_future']).toHaveLength(1);
    expect(state.exceptions['rec_future']).toBeUndefined();

    // 2. Exception item arrives
    const itemEvent: TelemetryEvent = {
      project: 'closeproof',
      event: 'recon_exception',
      severity: 'warn',
      ts: 1727870402000,
      payload: {
        id: 'rec_future',
        amount: -147,
        status: 'exception',
        candidates: [],
        confidence: 0.85,
        explanation: 'Fee detected',
        citations: [],
        human_action: 'approve_match',
      },
    };

    state = closeRoomReducer(state, { type: 'PROCESS_EVENT', event: itemEvent });
    // Orphan should now be reconciled into candidates
    expect(state.orphanEvents['rec_future']).toBeUndefined();
    expect(state.exceptions['rec_future']).toBeDefined();
    expect(state.exceptions['rec_future'].candidates).toHaveLength(1);
    expect(state.exceptions['rec_future'].candidates[0].doc_id).toBe('ch_123');
  });

  it('records explain_done payload and advances stage to Explaining', () => {
    const event: TelemetryEvent = {
      project: 'closeproof',
      event: 'explain_done',
      severity: 'info',
      ts: 1727870403000,
      payload: {
        item_id: 'rec_147',
        model_tier: 'ultra',
        tokens: 350,
        latency_ms: 1200,
        explanation: 'Detailed audit trail explanation',
        missing_evidence: ['Bank fee schedule PDF'],
        candidate_scores: [],
        recommended_action: 'approve_match',
        confidence: 0.9,
        citations: ['https://example.com/fees'],
      },
    };

    const state = closeRoomReducer(INITIAL_STATE, { type: 'PROCESS_EVENT', event });
    expect(state.explanations['rec_147']).toBeDefined();
    expect(state.explanations['rec_147'].model_tier).toBe('ultra');
    expect(state.stage).toBe('Explaining');
  });

  it('handles packet_ready with summary', () => {
    const event: TelemetryEvent = {
      project: 'closeproof',
      event: 'packet_ready',
      severity: 'info',
      ts: 1727870410000,
      payload: {
        run_id: '01JB0000000000000000000000',
        summary: {
          matched_count: 40,
          exception_count: 2,
          total_unreconciled_cents: 29400,
        },
      },
    };

    const state = closeRoomReducer(INITIAL_STATE, { type: 'PROCESS_EVENT', event });
    expect(state.packetReady).toBe(true);
    expect(state.packetSummary?.matchedCount).toBe(40);
    expect(state.packetSummary?.totalUnreconciledCents).toBe(29400);
    expect(state.stage).toBe('Packet ready');
  });

  it('records local demo actions without mutating item authoritative action', () => {
    const actionState = closeRoomReducer(INITIAL_STATE, {
      type: 'RECORD_DEMO_ACTION',
      itemId: 'rec_147',
      action: 'approve_match',
    });
    expect(actionState.demoActions['rec_147']).toBe('approve_match');
  });
});
