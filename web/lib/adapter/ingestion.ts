/**
 * CloseProof Ingestion and Lifecycle Adapter
 * 
 * Boundary G-5: CloseProof frontend stages source metadata and initiates reconciliation.
 * The backend pipeline executes actual file parsing, OCR, and model processing.
 * Client-side validation checks file format, file size, and staging readiness.
 */

export type SourceKey = 'bank' | 'stripe' | 'invoices' | 'receipts';

export type RunLifecycle =
  | 'idle'
  | 'ready'
  | 'starting'
  | 'active'
  | 'completed'
  | 'failed';

export interface StagedSourceFile {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  isSample?: boolean;
}

export interface SourceDefinition {
  key: SourceKey;
  label: string;
  description: string;
  acceptedExtensions: string[];
  acceptedMimeTypes: string[];
  formatLabel: string;
  pipelineRole: string;
}

export const SOURCE_DEFINITIONS: Record<SourceKey, SourceDefinition> = {
  bank: {
    key: 'bank',
    label: 'Bank Transactions',
    description: 'Operating account ledger and cash movements',
    acceptedExtensions: ['.csv'],
    acceptedMimeTypes: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
    formatLabel: 'CSV',
    pipelineRole: 'Base transaction register for month-end close',
  },
  stripe: {
    key: 'stripe',
    label: 'Stripe Payouts',
    description: 'Payment gateway payouts and merchant fees',
    acceptedExtensions: ['.csv'],
    acceptedMimeTypes: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
    formatLabel: 'CSV',
    pipelineRole: 'Payment processor gross-to-net settlement',
  },
  invoices: {
    key: 'invoices',
    label: 'Invoices',
    description: 'Accounts receivable billing records and customer invoices',
    acceptedExtensions: ['.csv', '.json'],
    acceptedMimeTypes: ['text/csv', 'application/json', 'text/plain'],
    formatLabel: 'CSV / JSON',
    pipelineRole: 'Revenue verification and AR matching',
  },
  receipts: {
    key: 'receipts',
    label: 'Expense Receipts',
    description: 'Vendor payment receipt images for Tesseract OCR extraction',
    acceptedExtensions: ['.png', '.jpg', '.jpeg'],
    acceptedMimeTypes: ['image/png', 'image/jpeg'],
    formatLabel: 'PNG, JPG',
    pipelineRole: 'Nemotron Nano receipt OCR & entity extraction',
  },
};

/**
 * Format raw byte size into human-readable notation (KB / MB).
 * Avoids raw unformatted byte displays or misleading line count guesses.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate an uploaded file against source requirements.
 */
export function validateSourceFile(
  file: { name: string; size: number; type?: string },
  sourceKey: SourceKey
): { valid: boolean; error?: string } {
  const def = SOURCE_DEFINITIONS[sourceKey];
  if (!def) {
    return { valid: false, error: `Unknown source key: ${sourceKey}` };
  }

  // Maximum file size limit: 50MB per file
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  if (file.size <= 0) {
    return { valid: false, error: 'File is empty (0 bytes).' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File exceeds maximum size of 50 MB.' };
  }

  const lowerName = file.name.toLowerCase();
  const hasValidExt = def.acceptedExtensions.some((ext) => lowerName.endsWith(ext));

  if (!hasValidExt) {
    return {
      valid: false,
      error: `Invalid file format for ${def.label}. Expected ${def.formatLabel}.`,
    };
  }

  return { valid: true };
}

/**
 * Sample dataset definitions for instant staging.
 * Allows reproducible live demos and end-to-end testing without manual file uploads.
 */
export const SAMPLE_SOURCE_BATCH: Record<SourceKey, StagedSourceFile> = {
  bank: {
    name: 'oct_2026_operating_bank.csv',
    size: 28450,
    type: 'text/csv',
    isSample: true,
  },
  stripe: {
    name: 'oct_2026_stripe_payouts.csv',
    size: 14200,
    type: 'text/csv',
    isSample: true,
  },
  invoices: {
    name: 'oct_2026_ar_invoices.csv',
    size: 42100,
    type: 'text/csv',
    isSample: true,
  },
  receipts: {
    name: 'uber_receipt_oct_147.png',
    size: 154800,
    type: 'image/png',
    isSample: true,
  },
};
