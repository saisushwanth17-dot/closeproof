import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-6 text-xs text-slate-500">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-medium text-slate-700">
            CloseProof · Forensic Reconciliation & Month-End Close
          </p>
          <p className="mt-0.5 text-slate-500">
            Core principle: CloseProof produces proof, not silent ledger changes.
          </p>
        </div>

        <nav aria-label="Legal and source links" className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="text-slate-600 hover:text-slate-900 underline underline-offset-2"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-slate-600 hover:text-slate-900 underline underline-offset-2"
          >
            Terms of Service
          </Link>
          <Link
            href="/replay"
            className="text-slate-600 hover:text-slate-900 underline underline-offset-2"
          >
            Replay Mode
          </Link>
          <span className="text-slate-400">|</span>
          <span className="font-mono text-[11px] text-slate-500">UTC System Time</span>
        </nav>
      </div>
    </footer>
  );
}
