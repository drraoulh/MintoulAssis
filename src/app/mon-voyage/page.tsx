'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Pencil, Compass } from 'lucide-react';

import { TourismMap } from '@/components/maps/TourismMap';
import { PageTransition } from '@/components/motion';
import { Button, EmptyState } from '@/components/ui';
import { useLocale } from '@/lib/i18n';
import { loadTrip } from '@/lib/trip-store';
import type { TripState } from '@/lib/types';

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[var(--line)] py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label.replace(/:\s*$/, '')}
      </dt>
      <dd className="min-w-0 break-words text-sm font-medium text-[var(--ink)] sm:text-right">
        {value}
      </dd>
    </div>
  );
}

export default function MonVoyagePage() {
  const { t } = useLocale();
  const [trip, setTrip] = useState<TripState | null>(null);

  useEffect(() => {
    setTrip(loadTrip());
  }, []);

  if (!trip) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-12">
        <div className="h-40 animate-pulse rounded-2xl bg-[var(--line)]" />
      </div>
    );
  }

  const markers = trip.places
    .filter(
      (p) =>
        typeof p.latitude === 'number' &&
        typeof p.longitude === 'number' &&
        Number.isFinite(p.latitude) &&
        Number.isFinite(p.longitude),
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude as number,
      longitude: p.longitude as number,
      category: p.category,
    }));

  const empty =
    !trip.destination &&
    !trip.places.length &&
    !trip.hotel &&
    !trip.bookings.length &&
    !trip.itineraryText;

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 md:py-12">
        <header className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-[var(--green-deep)] sm:text-4xl">
            {t('trip.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
            {t('trip.hub')}
          </p>
        </header>

        {empty ? (
          <div className="mt-8">
            <EmptyState title={t('trip.emptyTitle')} body={t('trip.emptyBody')} />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button href="/explorer" className="w-full sm:w-auto">
                {t('nav.explorer')}
              </Button>
              <Button href="/planifier" variant="secondary" className="w-full sm:w-auto">
                {t('nav.planifier')}
              </Button>
              <Button href="/assistant" variant="outline" className="w-full sm:w-auto">
                <MessageCircle className="h-4 w-4" aria-hidden />
                {t('trip.ask')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-2">
              <Button href="/assistant" size="sm" className="w-full justify-center sm:w-auto">
                <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                {t('trip.ask')}
              </Button>
              <Button
                href="/planifier"
                size="sm"
                variant="outline"
                className="w-full justify-center sm:w-auto"
              >
                <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                {t('trip.edit')}
              </Button>
              <Button
                href="/explorer"
                size="sm"
                variant="secondary"
                className="w-full justify-center sm:w-auto"
              >
                <Compass className="h-4 w-4 shrink-0" aria-hidden />
                {t('trip.exploreAround')}
              </Button>
            </div>

            {/* min-w-0 prevents Leaflet from forcing page-wide horizontal scroll */}
            <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8">
              <div className="order-2 min-w-0 space-y-4 sm:space-y-6 lg:order-1">
                <section className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:rounded-3xl sm:p-6">
                  <h2 className="font-display text-xl font-semibold text-[var(--green-deep)] sm:text-2xl">
                    {t('trip.summary')}
                  </h2>
                  <dl className="mt-2">
                    <SummaryRow
                      label={t('trip.destination')}
                      value={trip.destination ?? t('common.na')}
                    />
                    <SummaryRow
                      label={t('trip.dates')}
                      value={trip.dates ?? t('common.na')}
                    />
                    <SummaryRow
                      label={t('trip.travelers')}
                      value={
                        trip.travelers != null ? String(trip.travelers) : t('common.na')
                      }
                    />
                    <SummaryRow
                      label={t('trip.budget')}
                      value={
                        trip.budgetFcfa != null
                          ? `${trip.budgetFcfa.toLocaleString('fr-FR')} FCFA`
                          : t('common.na')
                      }
                    />
                  </dl>
                </section>

                <section className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:rounded-3xl sm:p-6">
                  <h2 className="font-display text-xl font-semibold text-[var(--green-deep)] sm:text-2xl">
                    {t('trip.places')}
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {trip.places.map((p) => (
                      <li key={p.id} className="min-w-0 break-words text-sm">
                        {p.name}
                        {p.city ? ` · ${p.city}` : ''}
                      </li>
                    ))}
                    {!trip.places.length ? (
                      <li className="text-sm text-[var(--muted)]">{t('trip.noPlaces')}</li>
                    ) : null}
                  </ul>
                </section>

                {trip.itineraryText ? (
                  <section className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:rounded-3xl sm:p-6">
                    <h2 className="font-display text-xl font-semibold text-[var(--green-deep)] sm:text-2xl">
                      {t('trip.itinerary')}
                    </h2>
                    <p className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                      {trip.itineraryText}
                    </p>
                  </section>
                ) : null}

                <section className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:rounded-3xl sm:p-6">
                  <h2 className="font-display text-xl font-semibold text-[var(--green-deep)] sm:text-2xl">
                    {t('trip.hotel')}
                  </h2>
                  <p className="mt-2 break-words text-sm">
                    {trip.hotel ? trip.hotel.name : t('trip.noHotel')}
                  </p>
                </section>

                <section className="rounded-2xl border border-[var(--line)] bg-white p-4 sm:rounded-3xl sm:p-6">
                  <h2 className="font-display text-xl font-semibold text-[var(--green-deep)] sm:text-2xl">
                    {t('trip.bookings')}
                  </h2>
                  <ul className="mt-3 space-y-3 text-sm">
                    {trip.bookings.map((b) => (
                      <li
                        key={b.reference}
                        className="min-w-0 break-words rounded-xl bg-[var(--ivory)] px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="break-all">{b.reference}</strong>
                          <span className="rounded-full bg-[var(--gold)]/30 px-2 py-0.5 text-xs">
                            {t('common.demo')}
                          </span>
                        </div>
                        <p className="mt-1 text-[var(--muted)]">
                          {b.hotelName}
                          <br />
                          {b.checkIn} → {b.checkOut}
                        </p>
                      </li>
                    ))}
                    {!trip.bookings.length ? (
                      <li className="text-[var(--muted)]">{t('trip.noBookings')}</li>
                    ) : null}
                  </ul>
                </section>
              </div>

              <aside className="order-1 min-w-0 lg:order-2 lg:sticky lg:top-24 lg:self-start">
                <h2 className="mb-3 font-display text-xl font-semibold text-[var(--green-deep)] sm:text-2xl">
                  {t('trip.map')}
                </h2>
                <div className="min-w-0 w-full overflow-hidden rounded-2xl">
                  <TourismMap
                    markers={markers}
                    className="h-56 w-full min-w-0 sm:h-72 md:h-80 lg:h-[28rem]"
                  />
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
