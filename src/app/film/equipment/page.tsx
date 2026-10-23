'use client';

import { useMemo, useState } from 'react';

import { EQUIPMENT_KINDS, FILM_EQUIPMENT } from '@/lib/film/equipment';
import { useLocale } from '@/lib/i18n';

export default function FilmEquipmentPage() {
  const { t, locale } = useLocale();
  const [kind, setKind] = useState<(typeof EQUIPMENT_KINDS)[number]['id'] | 'all'>('all');

  const items = useMemo(
    () => (kind === 'all' ? FILM_EQUIPMENT : FILM_EQUIPMENT.filter((i) => i.kind === kind)),
    [kind],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="max-w-2xl">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#F5E80C]">
          {t('film.nav.equipment')}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">
          {t('film.equipment.title')}
        </h1>
        <p className="mt-3 text-sm text-white/60 sm:text-base">{t('film.equipment.sub')}</p>
      </header>

      <div className="mt-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setKind('all')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            kind === 'all' ? 'bg-[#E30D13] text-white' : 'bg-white/5 text-white/60'
          }`}
        >
          {t('film.equipment.all')}
        </button>
        {EQUIPMENT_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              kind === k.id ? 'bg-[#E30D13] text-white' : 'bg-white/5 text-white/60'
            }`}
          >
            {locale === 'fr' ? k.fr : k.en}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const meta = EQUIPMENT_KINDS.find((k) => k.id === item.kind);
          return (
            <article
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#F5E80C]">
                {locale === 'fr' ? meta?.fr : meta?.en}
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold text-[#F8F5ED]">
                {locale === 'fr' ? item.nameFr : item.nameEn}
              </h2>
              <p className="mt-1 text-xs text-white/45">
                {locale === 'fr' ? item.cityFr : item.cityEn}
              </p>
              <p className="mt-3 text-sm text-white/65">
                {locale === 'fr' ? item.notesFr : item.notesEn}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
