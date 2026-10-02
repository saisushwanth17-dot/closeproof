'use client';

import React from 'react';
import { ShieldCheck, Play, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface NavbarProps {
  onRunClose?: () => void;
  isRunning?: boolean;
}

export function Navbar({ onRunClose, isRunning = false }: NavbarProps) {
  return (
    <nav
      className="sticky top-0 z-40 w-full h-14 backdrop-blur bg-background/85 border-b border-border transition-colors"
      role="navigation"
      aria-label="Main Navigation"
    >
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Tagline */}
        <a href="#overview" className="flex items-center gap-2 group focus:outline-none">
          <div className="w-8 h-8 rounded bg-brand/10 border border-brand/20 flex items-center justify-center text-brand group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5 text-brand" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-base tracking-tight text-foreground">
              CloseProof
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-subtle border border-border text-foreground-muted">
              v1.0
            </span>
          </div>
        </a>

        {/* Center: Anchor Navigation Links */}
        <div className="hidden md:flex items-center gap-1 text-xs font-medium text-foreground-muted">
          <a
            href="#overview"
            className="px-2.5 py-1.5 rounded hover:text-foreground hover:bg-surface-subtle transition-colors"
          >
            Overview
          </a>
          <a
            href="#closeroom"
            className="px-2.5 py-1.5 rounded hover:text-foreground hover:bg-surface-subtle transition-colors"
          >
            Close Room
          </a>
          <a
            href="#pipeline"
            className="px-2.5 py-1.5 rounded hover:text-foreground hover:bg-surface-subtle transition-colors"
          >
            Pipeline
          </a>
          <a
            href="#telemetry"
            className="px-2.5 py-1.5 rounded hover:text-foreground hover:bg-surface-subtle transition-colors"
          >
            Telemetry
          </a>
          <a
            href="#exceptions"
            className="px-2.5 py-1.5 rounded hover:text-foreground hover:bg-surface-subtle transition-colors"
          >
            Exceptions
          </a>
          <a
            href="#packet"
            className="px-2.5 py-1.5 rounded hover:text-foreground hover:bg-surface-subtle transition-colors"
          >
            Packet
          </a>
          <a
            href="#architecture"
            className="px-2.5 py-1.5 rounded hover:text-foreground hover:bg-surface-subtle transition-colors"
          >
            Architecture
          </a>
        </div>

        {/* Right: Actions & Theme Toggle */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {onRunClose && (
            <button
              type="button"
              onClick={onRunClose}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 rounded bg-brand text-brand-foreground px-3.5 py-1.5 text-xs font-semibold hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Reconciling...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Close</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
