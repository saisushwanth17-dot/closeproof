'use client';

import React from 'react';
import { Play, Sparkles, ArrowDown, Shield, Cpu, Cloud, Search } from 'lucide-react';

interface HeroProps {
  onRunClose?: () => void;
  isRunning?: boolean;
}

export function Hero({ onRunClose, isRunning = false }: HeroProps) {
  return (
    <section
      id="overview"
      className="relative overflow-hidden border-b border-border bg-gradient-to-b from-surface via-background to-background py-14 sm:py-20"
      aria-label="Hero Overview"
    >
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-8">
        {/* Top Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand/30 bg-brand/10 text-brand text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Autonomous Month-End Financial Close Agent</span>
        </div>

        {/* H1 Main Heading */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          The month-end close that{' '}
          <span className="bg-gradient-to-r from-brand via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            proves itself.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-3xl mx-auto text-base sm:text-lg text-foreground-muted leading-relaxed">
          CloseProof reconciles bank feeds, Stripe payouts, invoices and receipts into an
          evidence graph — and explains every dollar it can&apos;t.
        </p>

        {/* Pain Point Blockquote */}
        <div className="max-w-xl mx-auto pt-1">
          <blockquote className="border-l-2 border-brand/50 pl-4 py-1 text-left italic text-xs sm:text-sm text-foreground-muted bg-surface-subtle/60 rounded-r p-2 border border-border">
            &ldquo;I wasted 10 hours last Saturday on month-end close.&rdquo;
            <span className="block mt-1 not-italic font-mono text-[11px] text-foreground-subtle">
              — r/smallbusiness
            </span>
          </blockquote>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onRunClose && (
            <button
              type="button"
              onClick={onRunClose}
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded bg-brand text-brand-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-md cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isRunning ? 'Reconciling Live Ledger...' : 'Run Month-End Close'}</span>
            </button>
          )}

          <a
            href="#closeroom"
            className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-subtle transition-colors"
          >
            <span>Inspect Close Room</span>
            <ArrowDown className="w-4 h-4 text-foreground-muted" />
          </a>
        </div>

        {/* Trust Chips */}
        <div className="pt-6 border-t border-border/60">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-foreground-subtle mb-3">
            Engineered on Open Inference & Evidence Verification
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface text-xs font-medium text-foreground shadow-2xs">
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              NVIDIA Nemotron
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface text-xs font-medium text-foreground shadow-2xs">
              <Cloud className="w-3.5 h-3.5 text-sky-500" />
              Nebius Token Factory
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface text-xs font-medium text-foreground shadow-2xs">
              <Search className="w-3.5 h-3.5 text-amber-500" />
              Tavily
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <Shield className="w-3.5 h-3.5" />
              Proof, not ledger edits
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
