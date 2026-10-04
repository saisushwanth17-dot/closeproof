import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { InvestigationTimeline } from '@/components/drawer/InvestigationTimeline';
import { WhyNemotron } from '@/components/common/WhyNemotron';
import type { ReconItem } from '@/lib/contracts/contractB';
import type { TelemetryEvent } from '@/lib/contracts/contractC';

describe('InvestigationTimeline Component', () => {
  const sampleItem: ReconItem = {
    id: '01JB0000000000000000000002',
    amount: -147,
    status: 'exception',
    candidates: [],
    confidence: 0.92,
    explanation: 'Discrepancy detected',
    citations: [],
    human_action: 'escalate_accountant',
  };

  const sampleEvents: TelemetryEvent[] = [
    {
      project: 'closeproof',
      event: 'recon_exception',
      severity: 'warn',
      ts: 1727870400000,
      payload: { id: '01JB0000000000000000000002', amount: -147 },
    },
    {
      project: 'closeproof',
      event: 'tavily_lookup',
      severity: 'info',
      ts: 1727870402000,
      payload: { item_id: '01JB0000000000000000000002', query: 'Bank Service Fee' },
    },
    {
      // Event for a DIFFERENT item - must be filtered out
      project: 'closeproof',
      event: 'tavily_lookup',
      severity: 'info',
      ts: 1727870403000,
      payload: { item_id: '01JB0000000000000000000999', query: 'Other Vendor' },
    },
    {
      // Event with NO item_id - must be filtered out
      project: 'closeproof',
      event: 'sandbox_result',
      severity: 'info',
      ts: 1727870404000,
      payload: { test: true },
    },
  ];

  it('filters events strictly matching item ID via authoritative linkage', () => {
    render(<InvestigationTimeline item={sampleItem} events={sampleEvents} />);

    expect(screen.getByText('Exception Flagged')).toBeDefined();
    expect(screen.getByText('Verified externally')).toBeDefined();
    expect(screen.queryByText(/Other Vendor/)).toBeNull();
    expect(screen.getByText(/Vendor query: "Bank Service Fee"/)).toBeDefined();
  });
});

describe('WhyNemotron Component', () => {
  it('renders exact ratified copy for deterministic math and model roles', () => {
    render(<WhyNemotron />);

    expect(
      screen.getByText(
        'Accounting calculations and reconciliation math are code-driven. LLMs do not compute financial totals.'
      )
    ).toBeDefined();

    expect(
      screen.getByText(
        'Nemotron Nano: Fast extraction and normalization tasks (merchant normalization, receipt field extraction, and classification).'
      )
    ).toBeDefined();

    expect(
      screen.getByText(
        'Nemotron Ultra: Multi-document correlation, policy evaluation, and exception root-cause reasoning.'
      )
    ).toBeDefined();
  });
});
