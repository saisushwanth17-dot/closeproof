// CloseProof formatting utilities
// All times displayed in UTC to avoid hydration mismatches.


/**
 * ASSUMPTION(G-3): ts is "unix" but may be seconds or milliseconds.
 * Normalizes a unix timestamp to epoch milliseconds.
 * If ts < 1e11, it is treated as seconds and multiplied by 1000.
 */
export function normalizeTs(ts: number): number {
  if (ts < 1e11) {
    return ts * 1000;
  }
  return ts;
}

/**
 * Formats an epoch-ms timestamp as a UTC time string.
 * Uses a fixed locale format to avoid hydration mismatches.
 */
export function formatUtcTime(epochMs: number): string {
  const d = new Date(epochMs);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

/**
 * Formats an epoch-ms timestamp as a UTC date-time string.
 */
export function formatUtcDateTime(epochMs: number): string {
  const d = new Date(epochMs);
  const yyyy = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mo}-${dd} ${formatUtcTime(epochMs)}`;
}

/**
 * Converts an integer cent value to a formatted currency string.
 * Uses tabular numerals via CSS (font-variant-numeric: tabular-nums).
 */
export function formatCentsAsCurrency(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainder = absCents % 100;
  return `${sign}$${dollars.toLocaleString('en-US')}.${String(remainder).padStart(2, '0')}`;
}

/**
 * Converts a dollar amount to integer cents, rounding to avoid float drift.
 */
export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Formats a confidence value as a percentage string.
 * Example: 0.9 -> "90%"
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Formats a duration in milliseconds as MM:SS.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Returns the hostname from a URL string, or null if parsing fails.
 */
export function extractHostname(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.hostname;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Checks whether a string is a safe external URL (http: or https: only).
 */
export function isSafeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Formats a byte size into human readable string (KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}
