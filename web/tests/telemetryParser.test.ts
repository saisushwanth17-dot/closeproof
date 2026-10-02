import { describe, it, expect } from 'vitest';
import { parseTelemetryLine, parseTelemetryLines } from '@/lib/adapter/telemetryParser';

describe('telemetryParser', () => {
  it('parses a valid Contract C telemetry event', () => {
    const raw = JSON.stringify({
      project: 'closeproof',
      event: 'recon_match',
      severity: 'info',
      ts: 1727870400000,
      payload: {
        id: 'item_01',
        amount: 500,
        status: 'matched',
        candidates: [],
        confidence: 0.95,
        explanation: 'Matched invoice',
        citations: [],
        human_action: null,
      },
    });

    const result = parseTelemetryLine(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.project).toBe('closeproof');
      expect(result.event.event).toBe('recon_match');
      expect(result.event.severity).toBe('info');
      expect(result.event.ts).toBe(1727870400000);
      expect(result.event.payload.id).toBe('item_01');
    }
  });

  it('normalizes timestamp in seconds to milliseconds', () => {
    const raw = JSON.stringify({
      project: 'closeproof',
      event: 'feed_ingested',
      severity: 'info',
      ts: 1727870400,
      payload: { count: 10 },
    });

    const result = parseTelemetryLine(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.ts).toBe(1727870400000);
    }
  });

  it('rejects invalid JSON preserving the raw string', () => {
    const raw = '{ not valid json }';
    const result = parseTelemetryLine(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Invalid JSON');
      expect(result.raw).toBe(raw);
    }
  });

  it('rejects wrong project name', () => {
    const raw = JSON.stringify({
      project: 'other_project',
      event: 'recon_match',
      severity: 'info',
      ts: 1727870400000,
      payload: {},
    });

    const result = parseTelemetryLine(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Invalid project');
    }
  });

  it('rejects forbidden or unknown event names and surfaces error', () => {
    const raw = JSON.stringify({
      project: 'closeproof',
      event: 'ai_thinking',
      severity: 'info',
      ts: 1727870400000,
      payload: {},
    });

    const result = parseTelemetryLine(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Unknown event name');
    }
  });

  it('rejects invalid severity', () => {
    const raw = JSON.stringify({
      project: 'closeproof',
      event: 'recon_match',
      severity: 'critical',
      ts: 1727870400000,
      payload: {},
    });

    const result = parseTelemetryLine(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Invalid severity');
    }
  });

  it('validates confidence is between 0 and 1', () => {
    const invalidConfidence = JSON.stringify({
      project: 'closeproof',
      event: 'recon_match',
      severity: 'info',
      ts: 1727870400000,
      payload: { confidence: 1.5 },
    });

    const result = parseTelemetryLine(invalidConfidence);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Invalid confidence');
    }
  });

  it('parses multiple lines and preserves errors for malformed lines', () => {
    const multi = [
      JSON.stringify({
        project: 'closeproof',
        event: 'feed_ingested',
        severity: 'info',
        ts: 1727870400000,
        payload: { count: 5 },
      }),
      'malformed line',
      JSON.stringify({
        project: 'closeproof',
        event: 'packet_ready',
        severity: 'info',
        ts: 1727870405000,
        payload: { summary: {} },
      }),
    ].join('\n');

    const results = parseTelemetryLines(multi);
    expect(results).toHaveLength(3);
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
    expect(results[2].ok).toBe(true);
  });
});
