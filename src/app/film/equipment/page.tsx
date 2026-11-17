'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ExternalLink, MapPin, Phone } from 'lucide-react';

import { resolveFilmCoverUrl } from '@/lib/film/cover-url';
import { EQUIPMENT_KINDS, FILM_EQUIPMENT } from '@/lib/film/equipment';
import { useLocale } from '@/lib/i18n';

const FALLBACK = '/film/hub/equipment.jpg';

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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const meta = EQUIPMENT_KINDS.find((k) => k.id === item.kind);
          const cover = resolveFilmCoverUrl(item.image) || FALLBACK;
          const isRemote = /^https?:\/\//i.test(cover);
          return (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
            >
              <div className="relative aspect-[16/10] bg-black/40">
                <Image
                  src={cover}
                  alt={locale === 'fr' ? item.nameFr : item.nameEn}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                  unoptimized={isRemote}
                />
              </div>
              <div className="px-5 py-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#F5E80C]">
                  {locale === 'fr' ? meta?.fr : meta?.en}
                </p>
                <h2 className="mt-1 font-display text-lg font-semibold text-[#F8F5ED]">
                  {locale === 'fr' ? item.nameFr : item.nameEn}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/45">
                  <MapPin className="h-3.5 w-3.5 text-[#F5E80C]" aria-hidden />
                  {locale === 'fr' ? item.cityFr : item.cityEn}
                </p>
                {item.address ? (
                  <p className="mt-1 text-xs text-white/40">{item.address}</p>
                ) : null}
                <p className="mt-3 text-sm text-white/65">
                  {locale === 'fr' ? item.notesFr : item.notesEn}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                  {item.phone ? (
                    <a
                      href={`tel:${item.phone.split('/')[0].trim()}`}
                      className="inline-flex items-center gap-1.5 font-semibold text-[#F5E80C] hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      {item.phone}
                    </a>
                  ) : null}
                  {item.website ? (
                    <a
                      href={item.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-white/45 hover:text-white/75"
                    >
                      {t('film.equipment.website')}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
