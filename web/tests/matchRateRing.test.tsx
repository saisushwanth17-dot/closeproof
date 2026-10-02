import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MatchRateRing } from '@/components/common/MatchRateRing';

describe('MatchRateRing', () => {
  it('renders with correct ARIA meter attributes for 100%', () => {
    render(<MatchRateRing rate={100} />);
    const meter = screen.getByRole('meter');
    expect(meter).toBeDefined();
    expect(meter.getAttribute('aria-valuenow')).toBe('100');
    expect(meter.getAttribute('aria-valuemin')).toBe('0');
    expect(meter.getAttribute('aria-valuemax')).toBe('100');
    expect(meter.getAttribute('aria-label')).toBe('Reconciliation match rate');
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('correctly scales decimal rates (0.85 -> 85%)', () => {
    render(<MatchRateRing rate={0.85} />);
    const meter = screen.getByRole('meter');
    expect(meter.getAttribute('aria-valuenow')).toBe('85');
    expect(screen.getByText('85%')).toBeDefined();
  });

  it('clamps rates to 0% and 100%', () => {
    const { unmount } = render(<MatchRateRing rate={-15} />);
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('0');
    expect(screen.getByText('0%')).toBeDefined();
    unmount();

    render(<MatchRateRing rate={150} />);
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('100');
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('hides percentage text when showLabel is false', () => {
    render(<MatchRateRing rate={75} showLabel={false} />);
    expect(screen.queryByText('75%')).toBeNull();
    expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('75');
  });

  it('applies threshold styling classes for low, medium, and high match rates', () => {
    const { container: lowContainer, unmount: unmountLow } = render(<MatchRateRing rate={50} />);
    expect(lowContainer.querySelector('.stroke-foreground-muted')).toBeDefined();
    unmountLow();

    const { container: medContainer, unmount: unmountMed } = render(<MatchRateRing rate={85} />);
    expect(medContainer.querySelector('.stroke-exception')).toBeDefined();
    unmountMed();

    const { container: highContainer } = render(<MatchRateRing rate={98} />);
    expect(highContainer.querySelector('.stroke-matched')).toBeDefined();
  });
});
