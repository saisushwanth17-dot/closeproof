import Link from 'next/link';
import { LEGAL_PLACEHOLDERS } from '@/lib/constants';

export const metadata = {
  title: 'Privacy Policy',
  description: 'CloseProof application privacy disclosures and data handling policies.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="mx-auto max-w-3xl rounded-md border border-slate-200 bg-white p-8">
        <div className="border-b border-slate-200 pb-4 mb-6">
          <Link
            href="/"
            className="text-xs text-blue-800 hover:underline mb-2 inline-block"
          >
            &larr; Back to Close Room
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="mt-1 text-xs text-slate-500">
            Last updated: October 2026 · Status: Incomplete (Pending Legal Owner Review)
          </p>
        </div>

        {/* Notice of Placeholders */}
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <strong className="block mb-1">Notice to Reviewers:</strong>
          This document contains placeholder values for legal entities pending confirmation from the legal lead:
          <ul className="list-disc pl-5 mt-1 font-mono text-[11px]">
            {LEGAL_PLACEHOLDERS.map((p) => (
              <li key={p}>[{p}]</li>
            ))}
          </ul>
        </div>

        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">1. Operating Architecture</h2>
            <p>
              CloseProof is an autonomous reconciliation verification dashboard operating as a pair programming and audit tool.
              The frontend web application operates strictly without user accounts, persistent tracking cookies, or commercial web analytics scripts.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">2. Data Handling & Storage</h2>
            <p>
              All financial reconciliation datasets displayed in replay mode are synthetic fixture demonstrations.
              In live operating mode, telemetry events transmitted over WebSocket connections are stored in client-side memory
              for the active browser session only and are not persisted to third-party databases by the frontend application.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">3. External Communications</h2>
            <p>
              The frontend application connects solely to the configured WebSocket telemetry endpoint and local fixture paths.
              No marketing cookies, cross-site trackers, or third-party advertising SDKs are loaded.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-2">4. Legal Entity Disclosures</h2>
            <p>
              Operating Entity: <code>[{LEGAL_PLACEHOLDERS[0]}]</code><br />
              Registered Address: <code>[{LEGAL_PLACEHOLDERS[1]}]</code><br />
              Inquiries: <code>[{LEGAL_PLACEHOLDERS[2]}]</code><br />
              Governing Jurisdiction: <code>[{LEGAL_PLACEHOLDERS[3]}]</code>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
