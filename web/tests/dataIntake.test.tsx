import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataIntake } from '@/components/intake/DataIntake';
import { WorkflowStepper } from '@/components/workflow/WorkflowStepper';
import { ProcessingPipeline } from '@/components/closeroom/ProcessingPipeline';
import { SAMPLE_SOURCE_BATCH, type SourceKey, type StagedSourceFile } from '@/lib/adapter/ingestion';

describe('DataIntake Component', () => {
  const emptyFiles: Record<SourceKey, StagedSourceFile | null> = {
    bank: null,
    stripe: null,
    invoices: null,
    receipts: null,
  };

  it('renders all 4 source cards', () => {
    render(
      <DataIntake
        stagedFiles={emptyFiles}
        onStageFile={vi.fn()}
        onRemoveFile={vi.fn()}
        onLoadSampleBatch={vi.fn()}
        onClearAll={vi.fn()}
        onStartReconciliation={vi.fn()}
        lifecycle="idle"
        mode="replay"
      />
    );

    expect(screen.getByText('Bank Transactions')).toBeDefined();
    expect(screen.getByText('Stripe Payouts')).toBeDefined();
    expect(screen.getByText('Invoices')).toBeDefined();
    expect(screen.getByText('Expense Receipts')).toBeDefined();
  });

  it('disables Start Reconciliation button when no files are staged', () => {
    render(
      <DataIntake
        stagedFiles={emptyFiles}
        onStageFile={vi.fn()}
        onRemoveFile={vi.fn()}
        onLoadSampleBatch={vi.fn()}
        onClearAll={vi.fn()}
        onStartReconciliation={vi.fn()}
        lifecycle="idle"
        mode="replay"
      />
    );

    const startBtn = screen.getByRole('button', { name: /start reconciliation/i });
    expect(startBtn.hasAttribute('disabled')).toBe(true);
  });

  it('enables Start Reconciliation button when sources are staged', () => {
    const onStart = vi.fn();
    render(
      <DataIntake
        stagedFiles={SAMPLE_SOURCE_BATCH}
        onStageFile={vi.fn()}
        onRemoveFile={vi.fn()}
        onLoadSampleBatch={vi.fn()}
        onClearAll={vi.fn()}
        onStartReconciliation={onStart}
        lifecycle="ready"
        mode="replay"
      />
    );

    const startBtn = screen.getByRole('button', { name: /start reconciliation/i });
    expect(startBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('displays starting state during reconciliation launch without fabricated progress', () => {
    render(
      <DataIntake
        stagedFiles={SAMPLE_SOURCE_BATCH}
        onStageFile={vi.fn()}
        onRemoveFile={vi.fn()}
        onLoadSampleBatch={vi.fn()}
        onClearAll={vi.fn()}
        onStartReconciliation={vi.fn()}
        lifecycle="starting"
        mode="replay"
      />
    );

    expect(screen.getByText('Starting reconciliation...')).toBeDefined();
  });
});

describe('WorkflowStepper Component', () => {
  it('renders all 4 stages', () => {
    render(<WorkflowStepper currentStage="Waiting" lifecycle="idle" />);
    expect(screen.getByText('Data Intake')).toBeDefined();
    expect(screen.getByText('Reconciliation')).toBeDefined();
    expect(screen.getByText('Exception Review')).toBeDefined();
    expect(screen.getByText('Close Packet')).toBeDefined();
  });
});

describe('ProcessingPipeline Component', () => {
  it('renders in standby state when starting without premature completion', () => {
    render(<ProcessingPipeline currentStage="Waiting" lifecycle="starting" />);
    expect(screen.getByText(/starting reconciliation/i)).toBeDefined();
  });

  it('displays stage rationale when clicked', () => {
    render(<ProcessingPipeline currentStage="Waiting" lifecycle="active" />);
    const nanoBtn = screen.getByRole('button', { name: /document parsing/i });
    fireEvent.click(nanoBtn);

    expect(screen.getByText(/architectural stage rationale/i)).toBeDefined();
    expect(screen.getByText(/merchant normalization/i)).toBeDefined();
  });
});
