import { describe, it, expect } from 'vitest';
import {
  resolveAuthoritativeItemId,
  isHumanAction,
  isEvidence,
  isEvidenceArray,
  isReconItem,
} from '@/lib/contracts/guards';
import type { TelemetryEvent } from '@/lib/contracts/contractC';
import type { ReconItem } from '@/lib/contracts/contractB';

describe('Runtime Type Guards and Item Linkage', () => {
  describe('resolveAuthoritativeItemId', () => {
    it('resolves item ID from item_id field', () => {
      const event: TelemetryEvent = {
        project: 'closeproof',
        event: 'tavily_lookup',
        severity: 'info',
        ts: 1727870400000,
        payload: { item_id: '01JB0000000000000000000002', query: 'Uber Technologies' },
      };
      expect(resolveAuthoritativeItemId(event)).toBe('01JB0000000000000000000002');
    });

    it('resolves item ID from id field', () => {
      const event: TelemetryEvent = {
        project: 'closeproof',
        event: 'recon_exception',
        severity: 'warn',
        ts: 1727870400000,
        payload: { id: '01JB0000000000000000000003', amount: 147 },
      };
      expect(resolveAuthoritativeItemId(event)).toBe('01JB0000000000000000000003');
    });

    it('resolves item ID from itemId or recon_item_id fields', () => {
      const eventWithItemId: TelemetryEvent = {
        project: 'closeproof',
        event: 'evidence_attached',
        severity: 'info',
        ts: 1727870400000,
        payload: { itemId: 'ITEM-999' },
      };
      expect(resolveAuthoritativeItemId(eventWithItemId)).toBe('ITEM-999');

      const eventWithReconItemId: TelemetryEvent = {
        project: 'closeproof',
        event: 'explain_done',
        severity: 'info',
        ts: 1727870400000,
        payload: { recon_item_id: 'ITEM-888' },
      };
      expect(resolveAuthoritativeItemId(eventWithReconItemId)).toBe('ITEM-888');
    });

    it('returns null when no explicit identifier is present', () => {
      const eventWithoutId: TelemetryEvent = {
        project: 'closeproof',
        event: 'tavily_lookup',
        severity: 'info',
        ts: 1727870400000,
        payload: { query: 'General search without item' },
      };
      expect(resolveAuthoritativeItemId(eventWithoutId)).toBeNull();
    });

    it('returns null for empty strings or whitespace-only strings', () => {
      const eventWithEmptyId: TelemetryEvent = {
        project: 'closeproof',
        event: 'tavily_lookup',
        severity: 'info',
        ts: 1727870400000,
        payload: { item_id: '   ' },
      };
      expect(resolveAuthoritativeItemId(eventWithEmptyId)).toBeNull();
    });

    it('never infers item linkage from matching amounts or timestamps', () => {
      // Invariant: Even if amount matches -147, if payload lacks ID, resolver returns null
      const eventWithAmountOnly: TelemetryEvent = {
        project: 'closeproof',
        event: 'recon_exception',
        severity: 'warn',
        ts: 1727870400000,
        payload: { amount: -147 },
      };
      expect(resolveAuthoritativeItemId(eventWithAmountOnly)).toBeNull();
    });
  });

  describe('isHumanAction', () => {
    it('accepts null and valid human actions', () => {
      expect(isHumanAction(null)).toBe(true);
      expect(isHumanAction('approve_match')).toBe(true);
      expect(isHumanAction('request_receipt')).toBe(true);
      expect(isHumanAction('contact_vendor')).toBe(true);
      expect(isHumanAction('write_off')).toBe(true);
      expect(isHumanAction('escalate_accountant')).toBe(true);
    });

    it('rejects invalid action strings', () => {
      expect(isHumanAction('post_journal_entry')).toBe(false);
      expect(isHumanAction('delete_transaction')).toBe(false);
      expect(isHumanAction(123)).toBe(false);
    });
  });

  describe('isEvidence and isEvidenceArray', () => {
    it('validates proper Evidence structure', () => {
      const validEvidence = {
        source: 'bank_csv',
        doc_id: 'DOC-001',
        field: 'amount',
        value: '-147.00',
        url: null,
      };
      expect(isEvidence(validEvidence)).toBe(true);
      expect(isEvidenceArray([validEvidence])).toBe(true);
    });

    it('rejects malformed evidence objects', () => {
      expect(isEvidence({ source: 'bank' })).toBe(false);
      expect(isEvidence(null)).toBe(false);
      expect(isEvidenceArray([{ source: 123 }])).toBe(false);
    });
  });

  describe('isReconItem', () => {
    it('validates proper ReconItem structure', () => {
      const validItem: ReconItem = {
        id: '01JB0000000000000000000001',
        amount: -147,
        status: 'exception',
        candidates: [],
        confidence: 0.95,
        explanation: 'Unrecorded bank fee',
        citations: ['https://example.com'],
        human_action: 'escalate_accountant',
      };
      expect(isReconItem(validItem)).toBe(true);
    });
  });
});
