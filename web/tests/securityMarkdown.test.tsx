import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

describe('securityMarkdown', () => {
  it('does not render raw HTML script tags', () => {
    const maliciousInput = '# Hello\n<script>window.__injected = true;</script>\nWorld';
    const { container } = render(
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {maliciousInput}
      </ReactMarkdown>
    );

    // No <script> element should exist in the rendered DOM
    const scripts = container.querySelectorAll('script');
    expect(scripts).toHaveLength(0);

    // The raw script text is not executed
    expect((window as unknown as { __injected?: boolean }).__injected).toBeUndefined();
  });

  it('renders standard markdown elements safely', () => {
    const markdown = '## Summary\n- Item 1\n- Item 2\n\n[Link](https://example.com)';
    render(
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {markdown}
      </ReactMarkdown>
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Summary' })).toBeDefined();
    expect(screen.getByText('Item 1')).toBeDefined();
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link.getAttribute('href')).toBe('https://example.com');
  });
});
