'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';

import { FILM_RESOURCES, RESOURCE_KINDS, filterResources } from '@/lib/film/resources';
import type { ResourceKind } from '@/lib/film/types';
import { useLocale } from '@/lib/i18n';

export default function FilmResourcesPage() {
  const { t, locale } = useLocale();
  const [kind, setKind] = useState<ResourceKind | 'all'>('all');
  const [q, setQ] = useState('');

  const items = useMemo(() => filterResources({ kind, q }), [kind, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="max-w-2xl">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#F5E80C]">
          {t('film.nav.resources')}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">
          {t('film.resources.title')}
        </h1>
        <p className="mt-3 text-sm text-white/60 sm:text-base">{t('film.resources.sub')}</p>
        <p className="mt-2 text-xs text-[#F5E80C]/80">{t('film.resources.verifiedNote')}</p>
      </header>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('film.resources.search')}
            className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[#F8F5ED] outline-none placeholder:text-white/35"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip active={kind === 'all'} onClick={() => setKind('all')}>
          {t('film.resources.all')}
        </Chip>
        {RESOURCE_KINDS.map((k) => (
          <Chip key={k.id} active={kind === k.id} onClick={() => setKind(k.id)}>
            {locale === 'fr' ? k.fr : k.en}
          </Chip>
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {items.map((r) => {
          const kindMeta = RESOURCE_KINDS.find((k) => k.id === r.kind);
          return (
            <article
              key={r.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#079941]/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#F5E80C]">
                  {locale === 'fr' ? kindMeta?.fr : kindMeta?.en}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                  {t('film.resources.verified')}
                </span>
              </div>
              <h2 className="mt-2 font-display text-lg font-semibold text-[#F8F5ED]">
                {locale === 'fr' ? r.titleFr : r.titleEn}
              </h2>
              <p className="mt-1 text-xs text-white/45">
                {locale === 'fr' ? r.cityFr : r.cityEn}
                {r.periodFr
                  ? ` · ${locale === 'fr' ? r.periodFr : r.periodEn}`
                  : ''}
              </p>
              <p className="mt-3 text-sm text-white/65">
                {locale === 'fr' ? r.bodyFr : r.bodyEn}
              </p>
              {r.url ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#F5E80C] hover:underline"
                >
                  {t('film.resources.open')}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              ) : null}
            </article>
          );
        })}
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-white/50">{t('film.resources.empty')}</p>
      ) : null}

      <p className="mt-10 text-center text-xs text-white/35">
        {t('film.resources.count', { n: String(FILM_RESOURCES.length) })}
      </p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        active ? 'bg-[#079941] text-white' : 'bg-white/5 text-white/60'
      }`}
    >
      {children}
    </button>
  );
}
