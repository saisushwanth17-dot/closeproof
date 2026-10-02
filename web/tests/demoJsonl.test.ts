import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseTelemetryLine } from '@/lib/adapter/telemetryParser';
import type { ReconItem } from '@/lib/contracts/contractB';
import type { TelemetryEvent } from '@/lib/contracts/contractC';

// Crockford Base32 26-char ULID regex
const ULID_REGEX = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

describe('demoJsonl and manifest', () => {
  const metaPath = path.resolve(__dirname, '../public/replay/closeproof-demo.meta.json');
  const jsonlPath = path.resolve(__dirname, '../public/replay/closeproof-demo.jsonl');

  it('validates manifest metadata and ULID format', () => {
    expect(fs.existsSync(metaPath)).toBe(true);
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    expect(meta.provenance).toBe('synthetic-handwritten');
    expect(meta.run_id).toMatch(ULID_REGEX);
  });

  it('validates every line of closeproof-demo.jsonl is a valid Contract C envelope', () => {
    expect(fs.existsSync(jsonlPath)).toBe(true);
    const content = fs.readFileSync(jsonlPath, 'utf8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(25);

    const events: TelemetryEvent[] = [];

    lines.forEach((line, index) => {
      const result = parseTelemetryLine(line);
      expect(result.ok, `Line ${index + 1} failed: ${result.ok ? '' : result.error}`).toBe(true);
      if (result.ok) {
        events.push(result.event);
      }
    });

    // Feed ingested is first event and has ULID run_id
    expect(events[0].event).toBe('feed_ingested');
    const feedRunId = String(events[0].payload.run_id);
    expect(feedRunId).toMatch(ULID_REGEX);

    // Last event is packet_ready
    const last = events[events.length - 1];
    expect(last.event).toBe('packet_ready');
    expect(String(last.payload.run_id)).toBe(feedRunId);
  });

  it('covers all 8 required reconciliation anomalies', () => {
    const content = fs.readFileSync(jsonlPath, 'utf8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);
    const exceptions: ReconItem[] = [];

    lines.forEach((line) => {
      const result = parseTelemetryLine(line);
      if (result.ok && result.event.event === 'recon_exception') {
        exceptions.push(result.event.payload as unknown as ReconItem);
      }
    });

    expect(exceptions.length).toBe(8);

    // 1. $147 unrecorded bank fee
    const fee147 = exceptions.find((e) => e.amount === -147);
    expect(fee147).toBeDefined();
    expect(fee147?.human_action).toBe('approve_match');

    // 2. Duplicate Stripe import
    const dup = exceptions.find((e) => e.id.includes('dupstripe'));
    expect(dup).toBeDefined();
    expect(dup?.human_action).toBe('write_off');

    // 3. Missing receipt
    const missReceipt = exceptions.find((e) => e.id.includes('missreceipt'));
    expect(missReceipt).toBeDefined();
    expect(missReceipt?.human_action).toBe('request_receipt');

    // 4. Vendor name variant
    const vendorVar = exceptions.find((e) => e.id.includes('vendorvar'));
    expect(vendorVar).toBeDefined();
    expect(vendorVar?.human_action).toBe('approve_match');

    // 5. EUR FX rounding
    const eurFx = exceptions.find((e) => e.id.includes('eurfx'));
    expect(eurFx).toBeDefined();
    expect(eurFx?.amount).toBe(-0.04);
    expect(eurFx?.confidence).toBeLessThanOrEqual(0.9);

    // 6. Orphan invoice
    const orphan = exceptions.find((e) => e.id.includes('orphaninvo'));
    expect(orphan).toBeDefined();
    expect(orphan?.human_action).toBe('escalate_accountant');

    // 7. Owner coffee expense
    const coffee = exceptions.find((e) => e.id.includes('ownercoffee'));
    expect(coffee).toBeDefined();
    expect(coffee?.human_action).toBe('contact_vendor');

    // 8. Stripe refund offset
    const refund = exceptions.find((e) => e.id.includes('striperefund'));
    expect(refund).toBeDefined();
    expect(refund?.amount).toBe(-420);
  });

  it('verifies the complete $147 demo beat chain', () => {
    const content = fs.readFileSync(jsonlPath, 'utf8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);
    const events = lines.map((l) => parseTelemetryLine(l)).filter((r) => r.ok).map((r) => (r as { event: TelemetryEvent }).event);

    const feeEventIndex = events.findIndex((e) => e.event === 'recon_exception' && (e.payload as { amount?: number }).amount === -147);
    expect(feeEventIndex).toBeGreaterThan(-1);

    const followingEvents = events.slice(feeEventIndex + 1, feeEventIndex + 5);
    const followingNames = followingEvents.map((e) => e.event);

    // Must be closely followed by evidence_attached, tavily_lookup, explain_done
    expect(followingNames).toContain('evidence_attached');
    expect(followingNames).toContain('tavily_lookup');
    expect(followingNames).toContain('explain_done');

    const explain = followingEvents.find((e) => e.event === 'explain_done');
    expect(explain?.payload.model_tier).toBe('ultra');
    expect(explain?.payload.recommended_action).toBe('approve_match');
  });

  it('verifies all external synthetic URLs use reserved example domains', () => {
    const content = fs.readFileSync(jsonlPath, 'utf8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);

    lines.forEach((line) => {
      const matchUrls = line.match(/https?:\/\/[^\s"'\\]+/g);
      if (matchUrls) {
        matchUrls.forEach((url) => {
          expect(url).toContain('example.com');
        });
      }
    });
  });
});
