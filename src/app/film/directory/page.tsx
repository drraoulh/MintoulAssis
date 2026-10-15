'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import {
  DIRECTORY_CATEGORIES,
  filterDirectory,
} from '@/lib/film/directory';
import type { DirectoryCategory } from '@/lib/film/types';
import { REGIONS } from '@/lib/regions';
import { useLocale } from '@/lib/i18n';

export default function FilmDirectoryPage() {
  const { t, locale } = useLocale();
  const [category, setCategory] = useState<DirectoryCategory | 'all'>('all');
  const [regionId, setRegionId] = useState('all');
  const [q, setQ] = useState('');

  const entries = useMemo(
    () => filterDirectory({ category, regionId, q }),
    [category, regionId, q],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="max-w-2xl">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#FCD116]">
          {t('film.nav.directory')}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">
          {t('film.directory.title')}
        </h1>
        <p className="mt-3 text-sm text-white/60 sm:text-base">{t('film.directory.sub')}</p>
      </header>

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:p-4">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('film.directory.search')}
            className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[#F8F5ED] outline-none placeholder:text-white/35 focus:border-[#FCD116]/50"
          />
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as DirectoryCategory | 'all')}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[#F8F5ED]"
        >
          <option value="all">{t('film.directory.allCategories')}</option>
          {DIRECTORY_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {locale === 'fr' ? c.fr : c.en}
            </option>
          ))}
        </select>
        <select
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[#F8F5ED]"
        >
          <option value="all">{t('film.locations.allRegions')}</option>
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {locale === 'fr' ? r.nameFr : r.nameEn}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Chip active={category === 'all'} onClick={() => setCategory('all')}>
          {t('film.directory.allCategories')}
        </Chip>
        {DIRECTORY_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            active={category === c.id}
            onClick={() => setCategory(c.id)}
          >
            {locale === 'fr' ? c.fr : c.en}
          </Chip>
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {entries.map((e) => {
          const cat = DIRECTORY_CATEGORIES.find((c) => c.id === e.category);
          const region = REGIONS.find((r) => r.id === e.regionId);
          return (
            <article
              key={e.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#FCD116]">
                {locale === 'fr' ? cat?.fr : cat?.en}
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold text-[#F8F5ED]">
                {e.name}
              </h2>
              <p className="mt-1 text-xs text-white/45">
                {locale === 'fr' ? e.cityFr : e.cityEn}
                {region ? ` · ${locale === 'fr' ? region.nameFr : region.nameEn}` : ''}
              </p>
              <p className="mt-3 text-sm text-white/65">
                {locale === 'fr' ? e.specialtyFr : e.specialtyEn}
              </p>
              {e.contact ? (
                <p className="mt-3 text-xs text-white/40">{e.contact}</p>
              ) : null}
            </article>
          );
        })}
      </div>

      {entries.length === 0 ? (
        <p className="mt-10 text-center text-sm text-white/50">{t('film.directory.empty')}</p>
      ) : null}
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
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
        active ? 'bg-[#CE1126] text-white' : 'bg-white/5 text-white/60'
      }`}
    >
      {children}
    </button>
  );
}
