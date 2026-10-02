import { type ReactNode } from 'react';

type BadgeVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  info: 'bg-blue-100 text-blue-800 border-blue-300',
  success: 'bg-green-100 text-green-800 border-green-300',
  warning: 'bg-amber-100 text-amber-800 border-amber-300',
  error: 'bg-red-100 text-red-800 border-red-300',
  neutral: 'bg-slate-100 text-slate-700 border-slate-300',
};

type BadgeProps = {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
};

/**
 * Non-pill badge with max border radius of 6px.
 * Uses 800-level text on 100-level backgrounds for WCAG AA contrast.
 */
export function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
