import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  validateSourceFile,
  SAMPLE_SOURCE_BATCH,
  SOURCE_DEFINITIONS,
} from '@/lib/adapter/ingestion';

describe('Ingestion Adapter', () => {
  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('formats kilobytes correctly', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(154800)).toBe('151.2 KB');
    });

    it('formats megabytes correctly', () => {
      expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB');
    });
  });

  describe('validateSourceFile', () => {
    it('accepts valid CSV files for bank and stripe', () => {
      const bankResult = validateSourceFile({ name: 'transactions.csv', size: 1024 }, 'bank');
      expect(bankResult.valid).toBe(true);

      const stripeResult = validateSourceFile({ name: 'payouts.CSV', size: 2048 }, 'stripe');
      expect(stripeResult.valid).toBe(true);
    });

    it('accepts valid CSV and JSON files for invoices', () => {
      const csvResult = validateSourceFile({ name: 'invoices.csv', size: 1024 }, 'invoices');
      expect(csvResult.valid).toBe(true);

      const jsonResult = validateSourceFile({ name: 'invoices.json', size: 1024 }, 'invoices');
      expect(jsonResult.valid).toBe(true);
    });

    it('accepts image formats (PNG, JPG) for receipts', () => {
      const pngResult = validateSourceFile({ name: 'receipt.png', size: 10240 }, 'receipts');
      expect(pngResult.valid).toBe(true);

      const jpgResult = validateSourceFile({ name: 'receipt.jpg', size: 10240 }, 'receipts');
      expect(jpgResult.valid).toBe(true);
    });

    it('rejects PDF receipts per CP-3 pipeline specification (images only)', () => {
      const pdfResult = validateSourceFile({ name: 'receipt.pdf', size: 10240 }, 'receipts');
      expect(pdfResult.valid).toBe(false);
      expect(pdfResult.error).toContain('Invalid file format');
    });

    it('rejects empty files (0 bytes)', () => {
      const emptyResult = validateSourceFile({ name: 'empty.csv', size: 0 }, 'bank');
      expect(emptyResult.valid).toBe(false);
      expect(emptyResult.error).toContain('File is empty');
    });

    it('rejects files larger than 50 MB', () => {
      const hugeResult = validateSourceFile(
        { name: 'huge.csv', size: 55 * 1024 * 1024 },
        'bank'
      );
      expect(hugeResult.valid).toBe(false);
      expect(hugeResult.error).toContain('exceeds maximum size');
    });
  });

  describe('SAMPLE_SOURCE_BATCH', () => {
    it('contains all 4 source definitions with non-zero sizes', () => {
      expect(SAMPLE_SOURCE_BATCH.bank).toBeDefined();
      expect(SAMPLE_SOURCE_BATCH.bank.size).toBeGreaterThan(0);
      expect(SAMPLE_SOURCE_BATCH.stripe).toBeDefined();
      expect(SAMPLE_SOURCE_BATCH.invoices).toBeDefined();
      expect(SAMPLE_SOURCE_BATCH.receipts).toBeDefined();
      expect(SAMPLE_SOURCE_BATCH.receipts.name.endsWith('.png')).toBe(true);
    });
  });
});
