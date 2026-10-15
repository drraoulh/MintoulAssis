'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Columns2, MapPin, Search } from 'lucide-react';

import { TourismMap } from '@/components/maps/TourismMap';
import { getFilmAudience } from '@/lib/film/audience';
import {
  FILM_LOOKS,
  filterFilmLocations,
  filmLocationCover,
} from '@/lib/film/locations';
import type { AccessLevel, CostTier, FilmLook } from '@/lib/film/types';
import { REGIONS } from '@/lib/regions';
import { useLocale } from '@/lib/i18n';
import type { MapMarker } from '@/lib/types';

export default function FilmLocationsPage() {
  const { t, locale } = useLocale();
  const [regionId, setRegionId] = useState('all');
  const [look, setLook] = useState<FilmLook | 'all'>('all');
  const [costTier, setCostTier] = useState<CostTier | 'all'>('all');
  const [accessLevel, setAccessLevel] = useState<AccessLevel | 'all'>('all');
  const [q, setQ] = useState('');
  const [showLocalFilters, setShowLocalFilters] = useState(false);

  useEffect(() => {
    setShowLocalFilters(getFilmAudience() === 'local');
  }, []);

  const locations = useMemo(
    () =>
      filterFilmLocations({
        regionId,
        look,
        q,
        costTier: showLocalFilters ? costTier : 'all',
        accessLevel: showLocalFilters ? accessLevel : 'all',
      }),
    [regionId, look, q, costTier, accessLevel, showLocalFilters],
  );

  const markers: MapMarker[] = useMemo(
    () =>
      locations.map((loc) => ({
        id: loc.placeId,
        name: locale === 'fr' ? loc.nameFr : loc.nameEn,
        latitude: loc.latitude,
        longitude: loc.longitude,
        category: loc.looks[0],
      })),
    [locations, locale],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#FCD116]">
            {t('film.nav.locations')}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">
            {t('film.locations.title')}
          </h1>
          <p className="mt-3 text-sm text-white/60 sm:text-base">{t('film.locations.sub')}</p>
        </div>
        <Link
          href="/film/locations/compare"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold text-[#FCD116] hover:border-[#FCD116]"
        >
          <Columns2 className="h-3.5 w-3.5" aria-hidden />
          {t('film.compare.cta')}
        </Link>
      </header>

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
        <label className="relative min-w-0 flex-1 sm:min-w-[12rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('film.locations.search')}
            className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[#F8F5ED] outline-none placeholder:text-white/35 focus:border-[#FCD116]/50"
          />
        </label>
        <select
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[#F8F5ED]"
          aria-label={t('film.locations.filterRegion')}
        >
          <option value="all">{t('film.locations.allRegions')}</option>
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {locale === 'fr' ? r.nameFr : r.nameEn}
            </option>
          ))}
        </select>
        <select
          value={look}
          onChange={(e) => setLook(e.target.value as FilmLook | 'all')}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[#F8F5ED]"
          aria-label={t('film.locations.filterLook')}
        >
          <option value="all">{t('film.locations.allLooks')}</option>
          {FILM_LOOKS.map((l) => (
            <option key={l.id} value={l.id}>
              {locale === 'fr' ? l.fr : l.en}
            </option>
          ))}
        </select>
        {showLocalFilters ? (
          <>
            <select
              value={costTier}
              onChange={(e) => setCostTier(e.target.value as CostTier | 'all')}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[#F8F5ED]"
              aria-label={t('film.cost.label')}
            >
              <option value="all">{t('film.cost.all')}</option>
              <option value="budget">{t('film.cost.budget')}</option>
              <option value="moderate">{t('film.cost.moderate')}</option>
              <option value="premium">{t('film.cost.premium')}</option>
            </select>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as AccessLevel | 'all')}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[#F8F5ED]"
              aria-label={t('film.access.label')}
            >
              <option value="all">{t('film.access.all')}</option>
              <option value="easy">{t('film.access.easy')}</option>
              <option value="moderate">{t('film.access.moderate')}</option>
              <option value="demanding">{t('film.access.demanding')}</option>
            </select>
          </>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setLook('all')}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            look === 'all' ? 'bg-[#CE1126] text-white' : 'bg-white/5 text-white/60'
          }`}
        >
          {t('film.locations.allLooks')}
        </button>
        {FILM_LOOKS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLook(l.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              look === l.id ? 'bg-[#CE1126] text-white' : 'bg-white/5 text-white/60'
            }`}
          >
            {locale === 'fr' ? l.fr : l.en}
          </button>
        ))}
      </div>

      {markers.length > 0 ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
          <TourismMap markers={markers} className="h-64 sm:h-80" />
        </div>
      ) : null}

      <p className="mt-6 text-sm text-white/45">
        {t('film.locations.count', { n: String(locations.length) })}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((loc) => {
          const cover = filmLocationCover(loc);
          const name = locale === 'fr' ? loc.nameFr : loc.nameEn;
          const city = locale === 'fr' ? loc.cityFr : loc.cityEn;
          return (
            <Link
              key={loc.slug}
              href={`/film/locations/${loc.slug}`}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-[#FCD116]/35"
            >
              <div className="relative aspect-[16/10] bg-white/5">
                {cover ? (
                  <Image
                    src={cover}
                    alt=""
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width:768px) 100vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/30">
                    <MapPin className="h-8 w-8" />
                  </div>
                )}
                {loc.alsoTourism ? (
                  <span className="absolute left-3 top-3 rounded-full bg-[#007A5E]/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    {t('film.sharedBadge')}
                  </span>
                ) : null}
              </div>
              <div className="px-4 py-4">
                <h2 className="font-display text-lg font-semibold text-[#F8F5ED]">{name}</h2>
                <p className="mt-1 text-sm text-white/50">{city}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-[#FCD116]/90">
                    {t(`film.cost.${loc.costTier}`)}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/60">
                    {t(`film.access.${loc.accessLevel}`)}
                  </span>
                  {loc.looks.slice(0, 2).map((lk) => {
                    const meta = FILM_LOOKS.find((x) => x.id === lk);
                    return (
                      <span
                        key={lk}
                        className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/60"
                      >
                        {locale === 'fr' ? meta?.fr : meta?.en}
                      </span>
                    );
                  })}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {locations.length === 0 ? (
        <p className="mt-10 text-center text-sm text-white/50">{t('film.locations.empty')}</p>
      ) : null}
    </div>
  );
}
