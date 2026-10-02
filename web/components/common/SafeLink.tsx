import { type ReactNode } from 'react';
import { isSafeUrl, extractHostname } from '@/lib/formatters';

type SafeLinkProps = {
  href: string;
  children?: ReactNode;
  className?: string;
};

/**
 * Renders an external link only if the URL is a safe http: or https: URL.
 * Displays the hostname for transparency.
 * Rejects javascript:, data:, and other dangerous protocols.
 */
export function SafeLink({ href, children, className = '' }: SafeLinkProps) {
  if (!isSafeUrl(href)) {
    // Render as plain text if the URL is not safe
    return (
      <span className={`text-slate-600 ${className}`}>
        {children ?? href}
      </span>
    );
  }

  const hostname = extractHostname(href);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-blue-800 underline underline-offset-2 hover:text-blue-900 ${className}`}
    >
      {children ?? href}
      {hostname && (
        <span className="ml-1 text-xs text-slate-500 no-underline">
          ({hostname})
        </span>
      )}
    </a>
  );
}
