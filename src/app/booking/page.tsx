'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Button, ErrorState, Input, Skeleton } from '@/components/ui';
import { fetchTouristSite, friendlyError, listTouristSites } from '@/lib/api/client';
import { useLocale } from '@/lib/i18n';
import { addBooking, makeBookingRef, setTripHotel } from '@/lib/trip-store';
import type { TouristSite } from '@/lib/types';

function BookingForm() {
  const { t } = useLocale();
  const params = useSearchParams();
  const hotelId = params.get('hotel');
  const [hotel, setHotel] = useState<TouristSite | null>(null);
  const [step, setStep] = useState(hotelId ? 1 : 0);
  const [checkIn, setCheckIn] = useState(params.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(params.get('checkOut') || '');
  const [guests, setGuests] = useState(params.get('guests') || '2');
  const [room, setRoom] = useState('Standard');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ref, setRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingHotel, setLoadingHotel] = useState(!!hotelId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hotelId) {
        setLoadingHotel(false);
        return;
      }
      setLoadingHotel(true);
      try {
        try {
          const one = await fetchTouristSite(hotelId);
          if (!cancelled) {
            setHotel(one);
            setStep((s) => (s === 0 ? 1 : s));
          }
        } catch {
          const all = await listTouristSites({
            category: 'hotels',
            limit: 96,
            includeHotels: true,
          });
          const found = all.items.find((s) => s.id === hotelId);
          if (!cancelled) {
            setHotel(found ?? null);
            if (found) setStep((s) => (s === 0 ? 1 : s));
          }
        }
      } catch (e) {
        if (!cancelled) setError(friendlyError(e));
      } finally {
        if (!cancelled) setLoadingHotel(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hotelId]);

  function onConfirm(e: FormEvent) {
    e.preventDefault();
    if (!hotel) return;
    const reference = makeBookingRef();
    setTripHotel({
      id: hotel.id,
      name: hotel.name,
      city: hotel.city,
      region: hotel.region,
      category: hotel.category,
    });
    addBooking({
      reference,
      hotelName: hotel.name,
      hotelId: hotel.id,
      checkIn,
      checkOut,
      guests: Number(guests) || 1,
      guestName: name,
      guestEmail: email,
      createdAt: new Date().toISOString(),
      demo: true,
    });
    setRef(reference);
    setStep(6);
  }

  if (ref) {
    return (
      <div className="rounded-3xl border border-[var(--line)] bg-white p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--green)]">
          {t('booking.demoNote')}
        </p>
        <h2 className="mt-3 font-display text-3xl text-[var(--green-deep)]">
          {t('booking.done')}
        </h2>
        <p className="mt-4 text-lg">
          Référence : <strong>{ref}</strong>
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">{t('booking.demoNote')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href="/mon-voyage">{t('nav.trip')}</Button>
          <Button href="/hotels" variant="secondary">
            {t('nav.hotels')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[var(--line)] bg-white p-6 md:p-8">
      <p className="inline-block rounded-full bg-[var(--gold)]/35 px-3 py-1 text-sm font-semibold text-[var(--green-deep)]">
        {t('booking.demoNote')}
      </p>
      <h1 className="mt-4 font-display text-3xl text-[var(--green-deep)]">
        {t('booking.title')}
      </h1>
      {error ? (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      ) : null}
      {loadingHotel ? (
        <Skeleton className="mt-4 h-6 w-2/3" />
      ) : hotel ? (
        <p className="mt-2 text-[var(--muted)]">
          {hotel.name} · {hotel.city}
          {hotel.price ? ` · ${hotel.price}` : ''}
        </p>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">
          {t('booking.selectHotel')}{' '}
          <a className="underline" href="/hotels">
            {t('nav.hotels')}
          </a>
          .
        </p>
      )}

      <ol className="mt-6 flex flex-wrap gap-2 text-xs">
        {[
          t('booking.step.hotel'),
          t('booking.step.dates'),
          t('booking.step.travelers'),
          t('booking.step.room'),
          t('booking.step.contact'),
          t('booking.step.summary'),
        ].map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 ${
              step === i
                ? 'bg-[var(--green)] text-white'
                : 'bg-[var(--line)] text-[var(--muted)]'
            }`}
          >
            {label}
          </li>
        ))}
      </ol>

      <form onSubmit={onConfirm} className="mt-8 space-y-4">
        {step === 0 && (
          <Button type="button" disabled={!hotel} onClick={() => setStep(1)}>
            {t('common.continue')}
          </Button>
        )}
        {step === 1 && (
          <>
            <label className="block text-sm font-medium">
              {t('booking.checkIn')}
              <Input
                className="mt-1"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              {t('booking.checkOut')}
              <Input
                className="mt-1"
                type="date"
                value={checkOut}
                min={checkIn || undefined}
                onChange={(e) => setCheckOut(e.target.value)}
                required
              />
            </label>
            <Button
              type="button"
              disabled={!checkIn || !checkOut || checkOut <= checkIn}
              onClick={() => setStep(2)}
            >
              {t('common.continue')}
            </Button>
          </>
        )}
        {step === 2 && (
          <>
            <label className="block text-sm font-medium">
              {t('booking.guests')}
              <Input
                className="mt-1"
                type="number"
                min={1}
                max={12}
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                required
              />
            </label>
            <Button type="button" onClick={() => setStep(3)}>
              {t('common.continue')}
            </Button>
          </>
        )}
        {step === 3 && (
          <>
            <label className="block text-sm font-medium">
              {t('booking.roomType')}
              <Input
                className="mt-1"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </label>
            <Button type="button" onClick={() => setStep(4)}>
              {t('common.continue')}
            </Button>
          </>
        )}
        {step === 4 && (
          <>
            <label className="block text-sm font-medium">
              {t('booking.guestName')}
              <Input
                className="mt-1"
                placeholder={t('booking.guestName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              {t('booking.guestEmail')}
              <Input
                className="mt-1"
                type="email"
                placeholder={t('booking.guestEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <Button type="button" onClick={() => setStep(5)}>
              {t('common.continue')}
            </Button>
          </>
        )}
        {step === 5 && (
          <>
            <div className="rounded-xl bg-[var(--mint-soft)] p-4 text-sm">
              <p>
                <strong>{hotel?.name}</strong>
              </p>
              <p>
                {checkIn} → {checkOut}
              </p>
              <p>
                {guests} · {room}
              </p>
              <p>
                {name} · {email}
              </p>
            </div>
            <Button type="submit">{t('booking.confirm')}</Button>
          </>
        )}
      </form>
    </div>
  );
}

export default function BookingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <BookingForm />
      </Suspense>
    </div>
  );
}
