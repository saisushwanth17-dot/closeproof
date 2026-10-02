import { describe, it, expect } from 'vitest';
import {
  normalizeTs,
  formatUtcTime,
  formatUtcDateTime,
  formatCentsAsCurrency,
  dollarsToCents,
  formatConfidence,
  formatDuration,
  isSafeUrl,
  extractHostname,
} from '@/lib/formatters';

describe('formatters', () => {
  describe('normalizeTs', () => {
    it('normalizes seconds (< 1e11) to milliseconds', () => {
      const seconds = 1727870400; // ~2024
      expect(normalizeTs(seconds)).toBe(1727870400000);
    });

    it('preserves timestamps already in milliseconds (>= 1e11)', () => {
      const ms = 1727870400000;
      expect(normalizeTs(ms)).toBe(1727870400000);
    });
  });

  describe('formatUtcTime', () => {
    it('formats epoch ms as UTC HH:MM:SS UTC', () => {
      // 2024-10-02T12:34:56.000Z
      const epoch = Date.UTC(2024, 9, 2, 12, 34, 56);
      expect(formatUtcTime(epoch)).toBe('12:34:56 UTC');
    });
  });

  describe('formatUtcDateTime', () => {
    it('formats epoch ms as YYYY-MM-DD HH:MM:SS UTC', () => {
      const epoch = Date.UTC(2024, 9, 2, 12, 34, 56);
      expect(formatUtcDateTime(epoch)).toBe('2024-10-02 12:34:56 UTC');
    });
  });

  describe('formatCentsAsCurrency', () => {
    it('formats positive cents as USD currency', () => {
      expect(formatCentsAsCurrency(14700)).toBe('$147.00');
      expect(formatCentsAsCurrency(0)).toBe('$0.00');
      expect(formatCentsAsCurrency(50)).toBe('$0.50');
      expect(formatCentsAsCurrency(12345678)).toBe('$123,456.78');
    });

    it('formats negative cents with leading minus sign', () => {
      expect(formatCentsAsCurrency(-14700)).toBe('-$147.00');
      expect(formatCentsAsCurrency(-50)).toBe('-$0.50');
    });
  });

  describe('dollarsToCents', () => {
    it('converts dollar amounts to integer cents avoiding float rounding issues', () => {
      expect(dollarsToCents(147.0)).toBe(14700);
      expect(dollarsToCents(-147.0)).toBe(-14700);
      expect(dollarsToCents(0.5)).toBe(50);
      expect(dollarsToCents(19.99)).toBe(1999);
    });
  });

  describe('formatConfidence', () => {
    it('formats confidence float to integer percentage string', () => {
      expect(formatConfidence(0.9)).toBe('90%');
      expect(formatConfidence(0.85)).toBe('85%');
      expect(formatConfidence(1.0)).toBe('100%');
      expect(formatConfidence(0.0)).toBe('0%');
    });
  });

  describe('formatDuration', () => {
    it('formats ms duration as MM:SS', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(65000)).toBe('01:05');
      expect(formatDuration(180000)).toBe('03:00');
    });
  });

  describe('isSafeUrl', () => {
    it('accepts valid http and https URLs', () => {
      expect(isSafeUrl('https://example.com')).toBe(true);
      expect(isSafeUrl('http://example.com/sub/path?q=1')).toBe(true);
    });

    it('rejects unsafe protocols or invalid strings', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeUrl('data:text/html,<h1>hi</h1>')).toBe(false);
      expect(isSafeUrl('mailto:test@example.com')).toBe(false);
      expect(isSafeUrl('not-a-url')).toBe(false);
    });
  });

  describe('extractHostname', () => {
    it('extracts hostname from valid HTTP/HTTPS URLs', () => {
      expect(extractHostname('https://api.stripe.com/v1/payouts')).toBe('api.stripe.com');
      expect(extractHostname('http://docs.example.org/spec')).toBe('docs.example.org');
    });

    it('returns null for invalid or non-HTTP URLs', () => {
      expect(extractHostname('javascript:void(0)')).toBe(null);
      expect(extractHostname('invalid-string')).toBe(null);
    });
  });
});
