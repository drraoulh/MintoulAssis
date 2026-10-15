'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Hotel,
  MapPin,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';

import { DestinationAutocomplete } from '@/components/planner/DestinationAutocomplete';
import { PageTransition } from '@/components/motion';
import { Badge, Button, EmptyState, ErrorState, Input, Skeleton } from '@/components/ui';
import { friendlyError, listTouristSites } from '@/lib/api/client';
import { resolveCameroonDestination } from '@/lib/cameroon-destinations';
import { useLocale } from '@/lib/i18n';
import { resolvePlaceImage } from '@/lib/place-images';
import { setTripHotel } from '@/lib/trip-store';
import { isHotelCategory } from '@/lib/utils/response';
import type { TouristSite } from '@/lib/types';

function isoTodayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(`${checkIn}T12:00:00`);
  const b = new Date(`${checkOut}T12:00:00`);
  const n = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function matchesDestination(hotel: TouristSite, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const blob = `${hotel.name} ${hotel.city} ${hotel.region}`.toLowerCase();
  if (blob.includes(q)) return true;
  const resolved = resolveCameroonDestination(query);
  if (!resolved) return false;
  const aliases = [
    resolved.name,
    resolved.nameEn,
    resolved.region,
    ...resolved.aliases,
  ]
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  return aliases.some((a) => blob.includes(a) || a.includes(hotel.city.toLowerCase()));
}

export default function HotelsPage() {
  const { t, locale } = useLocale();
  const [hotels, setHotels] = useState<TouristSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState(isoTodayPlus(7));
  const [checkOut, setCheckOut] = useState(isoTodayPlus(10));
  const [guests, setGuests] = useState(2);
  const [query, setQuery] = useState('');

  const load = useCallback(async (cityHint?: string) => {
    setLoading(true);
    setError(null);
    try {
      const resolved = cityHint ? resolveCameroonDestination(cityHint) : null;
      const city =
        resolved && resolved.kind !== 'region' ? resolved.name : cityHint?.trim() || undefined;
      const region =
        resolved?.kind === 'region'
          ? resolved.name
          : resolved?.region && !cityHint?.trim()
            ? undefined
            : undefined;

      const res = await listTouristSites({
        category: 'hotels',
        city: city || undefined,
        region: region || undefined,
        q: !city && cityHint?.trim() ? cityHint.trim() : undefined,
        limit: 96,
        includeHotels: true,
      });

      let items = res.items.filter((s) => isHotelCategory(s.category));
      // If city filter returned nothing, fall back to full lodging catalog then filter client-side.
      if (cityHint?.trim() && items.length === 0) {
        const all = await listTouristSites({
          category: 'hotels',
          limit: 96,
          includeHotels: true,
        });
        items = all.items
          .filter((s) => isHotelCategory(s.category))
          .filter((s) => matchesDestination(s, cityHint));
      }
      setHotels(items);
    } catch (e) {
      setError(friendlyError(e));
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const nights = nightsBetween(checkIn, checkOut);
  const dateError =
    checkIn && checkOut && nights <= 0
      ? locale === 'en'
        ? 'Check-out must be after check-in.'
        : 'La date de départ doit être après l’arrivée.'
      : null;

  const filtered = useMemo(() => {
    let list = hotels;
    if (destination.trim()) {
      list = list.filter((h) => matchesDestination(h, destination));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.description.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const pa = a.price ? 0 : 1;
      const pb = b.price ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name, 'fr');
    });
  }, [hotels, destination, query]);

  const cities = useMemo(() => {
    const set = new Set(hotels.map((h) => h.city).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [hotels]);

  function bookingHref(hotel: TouristSite): string {
    const q = new URLSearchParams({
      hotel: hotel.id,
      checkIn,
      checkOut,
      guests: String(guests),
    });
    return `/booking?${q.toString()}`;
  }

  function assistantHref(): string {
    const dest = destination.trim() || 'Douala';
    const msg =
      locale === 'en'
        ? `Suggest a verified hotel in ${dest} for ${guests} travelers from ${checkIn} to ${checkOut}.`
        : `Propose un hôtel vérifié à ${dest} pour ${guests} voyageurs du ${checkIn} au ${checkOut}.`;
    return `/assistant?q=${encodeURIComponent(msg)}`;
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    void load(destination);
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">
              SmartMboa
            </p>
            <h1 className="font-display text-3xl font-bold text-[var(--green-deep)] md:text-4xl">
              {t('hotels.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-[var(--muted)]">
              {t('hotels.sub', { demo: t('hotels.demo') })}
            </p>
          </div>
          <Badge tone="gold">{t('hotels.demo')}</Badge>
        </div>

        <form
          onSubmit={onSearch}
          className="mt-8 space-y-4 rounded-3xl border border-[var(--line)] bg-white p-4 shadow-[var(--shadow-soft)] md:p-5"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium text-[var(--green-deep)]">
              {t('hotels.destination')}
              <div className="mt-1">
                <DestinationAutocomplete
                  value={destination}
                  onChange={setDestination}
                  placeholder={t('hotels.cityPlaceholder')}
                  locale={locale === 'en' ? 'en' : 'fr'}
                />
              </div>
            </label>

            <label className="text-sm font-medium text-[var(--green-deep)]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {t('hotels.checkIn')}
              </span>
              <Input
                className="mt-1"
                type="date"
                value={checkIn}
                min={isoTodayPlus(0)}
                onChange={(e) => {
                  const v = e.target.value;
                  setCheckIn(v);
                  if (v && (!checkOut || checkOut <= v)) {
                    const d = new Date(`${v}T12:00:00`);
                    d.setDate(d.getDate() + 3);
                    setCheckOut(d.toISOString().slice(0, 10));
                  }
                }}
                required
              />
            </label>

            <label className="text-sm font-medium text-[var(--green-deep)]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {t('hotels.checkOut')}
              </span>
              <Input
                className="mt-1"
                type="date"
                value={checkOut}
                min={checkIn || isoTodayPlus(1)}
                onChange={(e) => setCheckOut(e.target.value)}
                required
              />
            </label>

            <label className="text-sm font-medium text-[var(--green-deep)]">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {t('hotels.travelers')}
              </span>
              <Input
                className="mt-1"
                type="number"
                min={1}
                max={12}
                value={guests}
                onChange={(e) =>
                  setGuests(Math.min(12, Math.max(1, Number(e.target.value) || 1)))
                }
                required
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="relative min-w-[12rem] flex-1 text-sm font-medium text-[var(--green-deep)]">
              <span className="sr-only">{t('hotels.searchName')}</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                aria-hidden
              />
              <Input
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('hotels.searchName')}
              />
            </label>
            <Button type="submit" className="shrink-0">
              {t('hotels.search')}
            </Button>
            {nights > 0 ? (
              <p className="text-sm text-[var(--muted)]">
                {t('hotels.nightsGuests', {
                  nights: String(nights),
                  guests: String(guests),
                })}
              </p>
            ) : null}
          </div>
          {dateError ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {dateError}
            </p>
          ) : null}

          {cities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {cities.slice(0, 10).map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setDestination(city);
                    void load(city);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    destination.trim().toLowerCase() === city.toLowerCase()
                      ? 'bg-[var(--green)] text-white'
                      : 'bg-[var(--mint-soft)] text-[var(--green-deep)] hover:bg-[var(--green)]/15'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          ) : null}
        </form>

        {error ? (
          <div className="mt-6">
            <ErrorState message={error} />
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">
            {loading
              ? t('hotels.loading')
              : t('hotels.results', { count: String(filtered.length) })}
          </p>
          <Link
            href={assistantHref()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--green)] underline-offset-2 hover:underline"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t('hotels.askAssistant')}
          </Link>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))
            : filtered.map((h) => {
                const image = resolvePlaceImage(h) || h.images?.[0] || null;
                return (
                  <article
                    key={h.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow-soft)]"
                  >
                    <div className="relative h-44 bg-gradient-to-br from-[var(--green-deep)] to-[var(--green)]">
                      {image ? (
                        <Image
                          src={image}
                          alt={h.name}
                          fill
                          className="object-cover"
                          sizes="(max-width:768px) 100vw, 33vw"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-white/80">
                          <Hotel className="h-12 w-12" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col space-y-3 p-5">
                      <h2 className="font-display text-xl font-semibold text-[var(--green-deep)]">
                        {h.name}
                      </h2>
                      <p className="flex items-center gap-1 text-sm text-[var(--muted)]">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {h.city}
                        {h.region && h.region !== h.city ? `, ${h.region}` : ''}
                      </p>
                      {h.price ? (
                        <Badge tone="gold">
                          {t('hotels.indicative')} : {h.price}
                        </Badge>
                      ) : (
                        <Badge tone="muted">{t('hotels.priceOnRequest')}</Badge>
                      )}
                      {h.description ? (
                        <p className="line-clamp-3 text-sm text-[var(--ink)]">
                          {h.description}
                        </p>
                      ) : null}
                      <div className="mt-auto flex flex-wrap gap-2 pt-1">
                        <Button
                          href={`/destinations/${encodeURIComponent(h.id)}`}
                          size="sm"
                          variant="secondary"
                        >
                          {t('common.details')}
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          disabled={!!dateError || nights <= 0}
                          onClick={() => {
                            setTripHotel({
                              id: h.id,
                              name: h.name,
                              city: h.city,
                              region: h.region,
                              category: h.category,
                              latitude: h.latitude,
                              longitude: h.longitude,
                            });
                            window.location.href = bookingHref(h);
                          }}
                        >
                          {t('ui.bookDemo')}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
        </div>

        {!loading && !filtered.length ? (
          <div className="mt-8">
            <EmptyState
              title={t('hotels.emptyTitle')}
              body={t('hotels.emptyBody')}
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <Button href={assistantHref()}>{t('hotels.askAssistant')}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDestination('');
                  setQuery('');
                  void load();
                }}
              >
                {t('hotels.showAll')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </PageTransition>
  );
}
