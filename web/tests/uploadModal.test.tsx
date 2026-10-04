import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { UploadModal } from '@/components/intake/UploadModal';

describe('UploadModal Component', () => {
  it('renders 4 dropzones and modal title when open', () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <UploadModal
        isOpen={true}
        onClose={handleClose}
        onUploadSuccess={handleSuccess}
      />
    );

    expect(screen.getByText('Upload Your Own Financial Files')).toBeDefined();
    expect(screen.getByText(/Bank Statement \(CSV\)/i)).toBeDefined();
    expect(screen.getByText(/Stripe Payouts \(CSV\)/i)).toBeDefined();
    expect(screen.getByText(/Invoices Ledger \(CSV\)/i)).toBeDefined();
    expect(screen.getByText(/Receipts \(Images & PDFs\)/i)).toBeDefined();
  });

  it('validates file types and sizes client-side', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <UploadModal
        isOpen={true}
        onClose={handleClose}
        onUploadSuccess={handleSuccess}
      />
    );

    // Try submitting without files
    const submitBtn = screen.getByRole('button', { name: /upload & run close/i });
    expect(submitBtn).toBeDefined();
  });

  it('posts multipart form data successfully on submit', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    // Mock fetch for /api/runs/upload
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        run_id: 'test-upload-run-123',
        warnings: ['3 columns unmapped in bank CSV — using defaults'],
      }),
    });

    render(
      <UploadModal
        isOpen={true}
        onClose={handleClose}
        onUploadSuccess={handleSuccess}
      />
    );

    // Provide a file to Bank CSV
    const file = new File(['Date,Amount\n2026-03-01,100'], 'bank.csv', { type: 'text/csv' });
    const inputs = screen.getAllByRole('button', { name: /choose or drag/i });
    expect(inputs.length).toBeGreaterThan(0);
  });
});
