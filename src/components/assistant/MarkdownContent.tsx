'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

import { prepareAiMarkdown } from '@/lib/markdown/sanitize-ai-markdown';

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a || []),
      ['href'],
      ['target'],
      ['rel'],
      ['className'],
    ],
    code: [...(defaultSchema.attributes?.code || []), ['className']],
    th: [...(defaultSchema.attributes?.th || []), ['align']],
    td: [...(defaultSchema.attributes?.td || []), ['align']],
  },
};

function hostnameLabel(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '') || href;
  } catch {
    return href;
  }
}

export function MarkdownContent({
  content,
  className = '',
  variant = 'default',
}: {
  content: string;
  className?: string;
  /** Dark overlays (voice mode) need light text. */
  variant?: 'default' | 'onDark';
}) {
  const { markdown } = prepareAiMarkdown(content);
  const onDark = variant === 'onDark';
  const ink = onDark ? 'text-white/90' : 'text-[var(--ink)]';
  const heading = onDark ? 'text-[var(--gold-soft)]' : 'text-[var(--green-deep)]';
  const muted = onDark ? 'text-white/65' : 'text-[var(--muted)]';
  const link = onDark
    ? 'font-medium text-[var(--gold-soft)] underline underline-offset-2'
    : 'font-medium text-[var(--green)] underline underline-offset-2 hover:text-[var(--green-deep)]';
  const codeBg = onDark ? 'bg-white/10' : 'bg-[var(--mint-soft)]';
  const tableHead = onDark ? 'bg-white/10' : 'bg-[var(--mint-soft)]';
  const border = onDark ? 'border-white/20' : 'border-[var(--line)]';

  return (
    <div
      className={`sm-md max-w-none break-words text-[15px] leading-relaxed ${ink} ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{
          h1: ({ children }) => (
            <h3 className={`mt-4 mb-2 font-display text-xl font-semibold first:mt-0 ${heading}`}>
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className={`mt-4 mb-2 font-display text-lg font-semibold first:mt-0 ${heading}`}>
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className={`mt-3 mb-1.5 font-display text-base font-semibold first:mt-0 ${heading}`}>
              {children}
            </h4>
          ),
          h4: ({ children }) => (
            <h5 className={`mt-3 mb-1 text-sm font-semibold first:mt-0 ${heading}`}>
              {children}
            </h5>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className={`font-semibold ${heading}`}>{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => {
            const url = typeof href === 'string' ? href : '';
            if (!/^https?:\/\//i.test(url)) {
              return <span>{children}</span>;
            }
            const label =
              typeof children === 'string' && /^https?:\/\//i.test(children)
                ? hostnameLabel(url)
                : children;
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                {label || hostnameLabel(url)}
              </a>
            );
          },
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto last:mb-0">
              <table className="w-full min-w-[16rem] border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={`${tableHead} text-left`}>{children}</thead>
          ),
          th: ({ children }) => (
            <th className={`border px-2 py-1.5 font-semibold ${border}`}>{children}</th>
          ),
          td: ({ children }) => (
            <td className={`border px-2 py-1.5 align-top ${border}`}>{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={`mb-3 border-l-4 border-[var(--gold)] pl-3 italic last:mb-0 ${muted}`}
            >
              {children}
            </blockquote>
          ),
          hr: () => <hr className={`my-4 ${border}`} />,
          code: ({ children, className: codeClass }) => {
            const inline = !codeClass;
            if (inline) {
              return (
                <code className={`rounded px-1 py-0.5 text-[0.9em] ${codeBg}`}>
                  {children}
                </code>
              );
            }
            return (
              <code className={`block overflow-x-auto rounded-xl p-3 text-sm ${codeBg}`}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="mb-3 last:mb-0">{children}</pre>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
