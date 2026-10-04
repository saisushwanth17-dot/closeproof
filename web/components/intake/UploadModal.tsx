'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Image as ImageIcon, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { getHttpApiUrl } from '@/lib/api/config';
import { formatBytes } from '@/lib/formatters';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (runId: string, warnings: string[]) => void;
}

const MAX_CSV_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_RECEIPT_SIZE = 15 * 1024 * 1024; // 15MB

export function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [stripeFile, setStripeFile] = useState<File | null>(null);
  const [invoicesFile, setInvoicesFile] = useState<File | null>(null);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const bankInputRef = useRef<HTMLInputElement>(null);
  const stripeInputRef = useRef<HTMLInputElement>(null);
  const invoicesInputRef = useRef<HTMLInputElement>(null);
  const receiptsInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const validateCsv = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      return 'File must be a valid .csv spreadsheet.';
    }
    if (file.size > MAX_CSV_SIZE) {
      return `File exceeds maximum size of 10MB (${formatBytes(file.size)}).`;
    }
    return null;
  };

  const validateReceipt = (file: File): string | null => {
    const validExts = ['.png', '.jpg', '.jpeg', '.pdf'];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    const isValidMime = file.type.startsWith('image/') || file.type === 'application/pdf';

    if (!hasValidExt && !isValidMime) {
      return `${file.name}: Must be an image (.png, .jpg) or .pdf document.`;
    }
    if (file.size > MAX_RECEIPT_SIZE) {
      return `${file.name}: Exceeds 15MB limit (${formatBytes(file.size)}).`;
    }
    return null;
  };

  const handleBankChange = (file: File | undefined) => {
    if (!file) return;
    const err = validateCsv(file);
    if (err) {
      setErrors((prev) => ({ ...prev, bank: err }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.bank;
        return next;
      });
      setBankFile(file);
    }
  };

  const handleStripeChange = (file: File | undefined) => {
    if (!file) return;
    const err = validateCsv(file);
    if (err) {
      setErrors((prev) => ({ ...prev, stripe: err }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.stripe;
        return next;
      });
      setStripeFile(file);
    }
  };

  const handleInvoicesChange = (file: File | undefined) => {
    if (!file) return;
    const err = validateCsv(file);
    if (err) {
      setErrors((prev) => ({ ...prev, invoices: err }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.invoices;
        return next;
      });
      setInvoicesFile(file);
    }
  };

  const handleReceiptsChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles: File[] = [];
    let errMessage: string | null = null;

    Array.from(files).forEach((f) => {
      const err = validateReceipt(f);
      if (err) {
        errMessage = err;
      } else {
        newFiles.push(f);
      }
    });

    if (errMessage) {
      const msg: string = errMessage;
      setErrors((prev) => ({ ...prev, receipts: msg }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.receipts;
        return next;
      });
    }

    if (newFiles.length > 0) {
      setReceiptFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const totalFiles = (bankFile ? 1 : 0) + (stripeFile ? 1 : 0) + (invoicesFile ? 1 : 0) + receiptFiles.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalFiles === 0) {
      setSubmitError('Please select at least one file to upload.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      if (bankFile) formData.append('bank_csv', bankFile);
      if (stripeFile) formData.append('stripe_csv', stripeFile);
      if (invoicesFile) formData.append('invoices_csv', invoicesFile);
      receiptFiles.forEach((file) => formData.append('receipts', file));

      const apiUrl = getHttpApiUrl();
      const res = await fetch(`${apiUrl}/api/runs/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const runId: string = data.run_id;
      const warnings: string[] = data.warnings || [];

      onUploadSuccess(runId, warnings);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload files to backend API.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded shadow-xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface-subtle">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand" />
            <h3 id="upload-modal-title" className="text-sm font-bold text-foreground">
              Upload Your Own Financial Files
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded text-foreground-muted hover:text-foreground hover:bg-surface transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <p className="text-foreground-muted leading-relaxed">
            Upload your monthly statements, Stripe settlement exports, invoice registers, and receipts.
            CloseProof matches transactions deterministically and prepares an accountant-ready close packet.
          </p>

          {submitError && (
            <div className="p-3 rounded border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* 4 Dropzones Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Bank CSV Dropzone */}
            <div className="p-3 rounded border border-border bg-surface-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-500" />
                  Bank Statement (CSV)
                </span>
                {bankFile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </div>
              <input
                ref={bankInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleBankChange(e.target.files?.[0])}
              />
              {bankFile ? (
                <div className="flex items-center justify-between p-2 rounded bg-surface border border-border">
                  <span className="font-mono text-[11px] truncate max-w-[180px]">{bankFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setBankFile(null)}
                    className="text-foreground-muted hover:text-rose-500 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => bankInputRef.current?.click()}
                  className="w-full border border-dashed border-border hover:border-brand p-3 rounded text-center text-foreground-muted hover:text-brand transition-colors bg-surface cursor-pointer"
                >
                  Choose or drag Bank CSV
                </button>
              )}
              {errors.bank && <p className="text-rose-500 text-[10px]">{errors.bank}</p>}
            </div>

            {/* 2. Stripe CSV Dropzone */}
            <div className="p-3 rounded border border-border bg-surface-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  Stripe Payouts (CSV)
                </span>
                {stripeFile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </div>
              <input
                ref={stripeInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleStripeChange(e.target.files?.[0])}
              />
              {stripeFile ? (
                <div className="flex items-center justify-between p-2 rounded bg-surface border border-border">
                  <span className="font-mono text-[11px] truncate max-w-[180px]">{stripeFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setStripeFile(null)}
                    className="text-foreground-muted hover:text-rose-500 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => stripeInputRef.current?.click()}
                  className="w-full border border-dashed border-border hover:border-brand p-3 rounded text-center text-foreground-muted hover:text-brand transition-colors bg-surface cursor-pointer"
                >
                  Choose or drag Stripe CSV
                </button>
              )}
              {errors.stripe && <p className="text-rose-500 text-[10px]">{errors.stripe}</p>}
            </div>

            {/* 3. Invoices CSV Dropzone */}
            <div className="p-3 rounded border border-border bg-surface-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  Invoices Ledger (CSV)
                </span>
                {invoicesFile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </div>
              <input
                ref={invoicesInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleInvoicesChange(e.target.files?.[0])}
              />
              {invoicesFile ? (
                <div className="flex items-center justify-between p-2 rounded bg-surface border border-border">
                  <span className="font-mono text-[11px] truncate max-w-[180px]">{invoicesFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setInvoicesFile(null)}
                    className="text-foreground-muted hover:text-rose-500 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => invoicesInputRef.current?.click()}
                  className="w-full border border-dashed border-border hover:border-brand p-3 rounded text-center text-foreground-muted hover:text-brand transition-colors bg-surface cursor-pointer"
                >
                  Choose or drag Invoices CSV
                </button>
              )}
              {errors.invoices && <p className="text-rose-500 text-[10px]">{errors.invoices}</p>}
            </div>

            {/* 4. Receipts Multi-file Dropzone */}
            <div className="p-3 rounded border border-border bg-surface-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                  Receipts (Images & PDFs)
                </span>
                {receiptFiles.length > 0 && (
                  <span className="font-mono text-[10px] text-emerald-600 font-semibold">
                    {receiptFiles.length} file{receiptFiles.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <input
                ref={receiptsInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                className="hidden"
                onChange={(e) => handleReceiptsChange(e.target.files)}
              />
              <button
                type="button"
                onClick={() => receiptsInputRef.current?.click()}
                className="w-full border border-dashed border-border hover:border-brand p-3 rounded text-center text-foreground-muted hover:text-brand transition-colors bg-surface cursor-pointer"
              >
                {receiptFiles.length > 0 ? '+ Add more receipts' : 'Choose or drag Receipt files'}
              </button>
              {receiptFiles.length > 0 && (
                <div className="max-h-20 overflow-y-auto space-y-1">
                  {receiptFiles.map((rf, idx) => (
                    <div key={`${rf.name}-${idx}`} className="flex items-center justify-between text-[10px] font-mono px-1.5 py-0.5 bg-surface rounded">
                      <span className="truncate max-w-[180px]">{rf.name}</span>
                      <button
                        type="button"
                        onClick={() => setReceiptFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-foreground-muted hover:text-rose-500"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {errors.receipts && <p className="text-rose-500 text-[10px]">{errors.receipts}</p>}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-[11px] font-mono text-foreground-muted">
              {totalFiles} source file{totalFiles === 1 ? '' : 's'} ready to upload
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded border border-border bg-surface hover:bg-surface-subtle text-foreground text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || totalFiles === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-brand text-brand-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading & Reconciling...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload & Run Close</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
