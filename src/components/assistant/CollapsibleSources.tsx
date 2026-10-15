'use client';

import { useId, useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';

import { useLocale } from '@/lib/i18n';
import type { SourceUI } from '@/lib/types';

function siteName(url: string, title?: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (title && title.trim() && !/^https?:\/\//i.test(title)) {
      return title.trim();
    }
    return host;
  } catch {
    return title?.trim() || url;
  }
}

/**
 * Collapsed-by-default sources footer. Only shows entries with http(s) URLs.
 */
export function CollapsibleSources({
  sources,
  className = '',
}: {
  sources?: SourceUI[] | null;
  className?: string;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const items = (sources ?? []).filter(
    (s) => typeof s.url === 'string' && /^https?:\/\//i.test(s.url),
  );
  // Dedupe by URL
  const seen = new Set<string>();
  const unique = items.filter((s) => {
    const u = s.url!;
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });

  if (!unique.length) return null;

  return (
    <div className={`border-t border-[var(--line)]/80 pt-3 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--green-deep)]"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
        {open ? t('sources.title') : t('sources.see')}
        <span className="tabular-nums text-[var(--muted)]">({unique.length})</span>
      </button>
      {open ? (
        <ul id={panelId} className="mt-2 space-y-1.5">
          {unique.map((s, i) => (
            <li key={`${s.url}-${i}`}>
              <a
                href={s.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex max-w-full items-start gap-1.5 text-xs text-[var(--green)] hover:underline"
              >
                <ExternalLink
                  className="mt-0.5 h-3 w-3 shrink-0 opacity-70"
                  aria-hidden
                />
                <span className="min-w-0 break-words">
                  <span className="font-medium text-[var(--green-deep)] group-hover:underline">
                    {siteName(s.url!, s.title)}
                  </span>
                  {s.title &&
                  s.title.trim() &&
                  !/^https?:\/\//i.test(s.title) &&
                  siteName(s.url!, s.title) !== s.title.trim() ? (
                    <span className="text-[var(--muted)]"> — {s.title.trim()}</span>
                  ) : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
