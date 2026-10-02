/**
 * CloseProof API Configuration
 * 
 * Centralizes backend endpoints, telemetry WebSocket URLs, and export routes
 * with environment variable support and safe fallbacks.
 */

export function getWsUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  return '';
}

export function getHttpApiUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  return 'http://localhost:8000';
}

export function getPacketExportUrl(runId: string, format: 'md' | 'pdf'): string {
  const base = getHttpApiUrl();
  return `${base}/api/runs/${encodeURIComponent(runId)}/packet.${format}`;
}
