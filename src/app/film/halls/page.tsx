'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Armchair, MapPin, Search, Theater } from 'lucide-react';

import { TourismMap } from '@/components/maps/TourismMap';
import {
  HALL_CITIES,
  filterHalls,
  type HallStatus,
} from '@/lib/film/halls';
import { useLocale } from '@/lib/i18n';
import type { MapMarker } from '@/lib/types';

export default function FilmHallsPage() {
  const { t, locale } = useLocale();
  const [city, setCity] = useState<string | 'all'>('all');
  const [status, setStatus] = useState<HallStatus | 'all'>('all');
  const [q, setQ] = useState('');

  const halls = useMemo(
    () => filterHalls({ city, status, q }),
    [city, status, q],
  );

  const markers: MapMarker[] = useMemo(
    () =>
      halls.map((h) => ({
        id: h.id,
        name: h.name,
        latitude: h.latitude,
        longitude: h.longitude,
        category: 'cinema',
      })),
    [halls],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="max-w-2xl">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#F5E80C]">
          {t('film.nav.halls')}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">
          {t('film.halls.title')}
        </h1>
        <p className="mt-3 text-sm text-white/60 sm:text-base">{t('film.halls.sub')}</p>
      </header>

      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:p-4">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('film.halls.search')}
            className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3 text-sm text-[#F8F5ED] outline-none placeholder:text-white/35"
          />
        </label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[#F8F5ED]"
        >
          <option value="all">{t('film.halls.allCities')}</option>
          {HALL_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as HallStatus | 'all')}
          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-[#F8F5ED]"
        >
          <option value="all">{t('film.halls.allStatus')}</option>
          <option value="active">{t('film.halls.status.active')}</option>
          <option value="verify">{t('film.halls.status.verify')}</option>
        </select>
      </div>

      {markers.length > 0 ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
          <TourismMap markers={markers} className="h-64 sm:h-80" />
        </div>
      ) : null}

      <p className="mt-6 text-sm text-white/45">
        {t('film.halls.count', { n: String(halls.length) })}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {halls.map((hall) => {
          const desc = locale === 'fr' ? hall.descriptionFr : hall.descriptionEn;
          const address = locale === 'fr' ? hall.addressFr : hall.addressEn;
          return (
            <Link
              key={hall.id}
              href={`/film/halls/${hall.slug}`}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-[#F5E80C]/35"
            >
              <div className="relative aspect-[16/10] bg-white/5">
                <Image
                  src={hall.image}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width:768px) 100vw, 33vw"
                />
                <span
                  className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    hall.status === 'verify'
                      ? 'bg-[#F5E80C] text-black'
                      : 'bg-[#079941] text-white'
                  }`}
                >
                  {t(`film.halls.status.${hall.status}`)}
                </span>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-start gap-2">
                  <Theater className="mt-0.5 h-4 w-4 shrink-0 text-[#F5E80C]" aria-hidden />
                  <h2 className="font-display text-lg font-semibold text-[#F8F5ED]">
                    {hall.name}
                  </h2>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/50">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {hall.city} · {address}
                </p>
                <p className="mt-3 line-clamp-2 text-sm text-white/60">{desc}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#F5E80C]">
                  <Armchair className="h-3.5 w-3.5" aria-hidden />
                  {hall.capacitySeats != null
                    ? t('film.halls.seats', { n: String(hall.capacitySeats) })
                    : t('film.halls.seatsUnknown')}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {halls.length === 0 ? (
        <p className="mt-10 text-center text-sm text-white/50">{t('film.halls.empty')}</p>
      ) : null}
    </div>
  );
}
