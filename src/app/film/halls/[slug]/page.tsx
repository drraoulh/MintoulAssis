'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Armchair,
  ArrowLeft,
  ExternalLink,
  MapPin,
  Theater,
} from 'lucide-react';

import { TourismMap } from '@/components/maps/TourismMap';
import { getHall } from '@/lib/film/halls';
import { useLocale } from '@/lib/i18n';

export default function FilmHallDetailPage() {
  const params = useParams();
  const slug = String(params.slug ?? '');
  const { t, locale } = useLocale();
  const hall = getHall(slug);

  if (!hall) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8F5ED]">
          {t('film.halls.notFound')}
        </h1>
        <Link
          href="/film/halls"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#FCD116]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('film.halls.back')}
        </Link>
      </div>
    );
  }

  const description = locale === 'fr' ? hall.descriptionFr : hall.descriptionEn;
  const address = locale === 'fr' ? hall.addressFr : hall.addressEn;
  const capacityNote = locale === 'fr' ? hall.capacityNoteFr : hall.capacityNoteEn;
  const booking = locale === 'fr' ? hall.bookingHintFr : hall.bookingHintEn;
  const statusNote = locale === 'fr' ? hall.statusNoteFr : hall.statusNoteEn;

  return (
    <div>
      <div className="relative h-56 overflow-hidden sm:h-72 md:h-80">
        <Image src={hall.image} alt="" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-6 sm:px-8">
          <Link
            href="/film/halls"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-[#FCD116]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('film.halls.back')}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                hall.status === 'verify'
                  ? 'bg-[#FCD116] text-black'
                  : 'bg-[#007A5E] text-white'
              }`}
            >
              {t(`film.halls.status.${hall.status}`)}
            </span>
            {hall.suitableFor.includes('premiere') ? (
              <span className="rounded-full border border-[#FCD116]/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#FCD116]">
                {t('film.halls.suitable.premiere')}
              </span>
            ) : null}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">
            {hall.name}
          </h1>
          <p className="mt-1 text-sm text-white/70">
            {hall.city}
            {hall.neighborhoodFr
              ? ` · ${locale === 'fr' ? hall.neighborhoodFr : hall.neighborhoodEn}`
              : ''}
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#FCD116]">
              <Theater className="h-3.5 w-3.5" aria-hidden />
              {t('film.halls.about')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/75">{description}</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#FCD116]">
              <Armchair className="h-3.5 w-3.5" aria-hidden />
              {t('film.halls.capacity')}
            </h2>
            <p className="mt-3 font-display text-2xl font-bold text-[#F8F5ED]">
              {hall.capacitySeats != null
                ? t('film.halls.seats', { n: String(hall.capacitySeats) })
                : t('film.halls.seatsUnknown')}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/40">
              {t(`film.halls.capacityStatus.${hall.capacityStatus}`)}
            </p>
            <p className="mt-3 text-sm text-white/65">{capacityNote}</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#FCD116]">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {t('film.halls.location')}
            </h2>
            <p className="mt-3 text-sm text-white/80">{address}</p>
            <p className="mt-1 font-mono text-xs text-white/40">
              {hall.latitude.toFixed(5)}, {hall.longitude.toFixed(5)}
            </p>
            {statusNote ? (
              <p className="mt-3 text-sm text-[#FCD116]/85">{statusNote}</p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[#CE1126]/35 bg-[#CE1126]/10 px-5 py-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#FCD116]">
              {t('film.halls.booking')}
            </h2>
            <p className="mt-3 text-sm text-white/75">{booking}</p>
            {hall.website ? (
              <a
                href={hall.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#FCD116] hover:underline"
              >
                {t('film.halls.website')}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <TourismMap
              markers={[
                {
                  id: hall.id,
                  name: hall.name,
                  latitude: hall.latitude,
                  longitude: hall.longitude,
                },
              ]}
              className="h-72"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-white/40">
              {t('film.halls.suitableTitle')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {hall.suitableFor.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/70"
                >
                  {t(`film.halls.suitable.${s}`)}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-white/35">
            {t('film.halls.imageNote')}
          </p>
        </aside>
      </div>
    </div>
  );
}
