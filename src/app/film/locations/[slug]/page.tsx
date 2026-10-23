'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Compass, Download } from 'lucide-react';

import { KIND_ICONS } from '@/components/film/location-kind-icons';
import { PlaceContactCard } from '@/components/film/PlaceContactCard';
import { TourismMap } from '@/components/maps/TourismMap';
import { setEntryMode } from '@/lib/entry-mode';
import { dossierPdfUrl } from '@/lib/film/dossier';
import {
  FILM_LOCATION_KINDS,
  FILM_LOOKS,
  filmLocationCover,
  filmLocationKind,
  getFilmLocation,
} from '@/lib/film/locations';
import { OSM_ATTRIBUTION } from '@/lib/film/osm-locations';
import { REGIONS } from '@/lib/regions';
import { useLocale } from '@/lib/i18n';

export default function FilmLocationDetailPage() {
  const params = useParams();
  const slug = String(params.slug ?? '');
  const { t, locale } = useLocale();
  const loc = getFilmLocation(slug);

  if (!loc) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#F8F5ED]">
          {t('film.locations.notFound')}
        </h1>
        <Link
          href="/film/locations"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#F5E80C]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('film.locations.back')}
        </Link>
      </div>
    );
  }

  const name = locale === 'fr' ? loc.nameFr : loc.nameEn;
  const city = locale === 'fr' ? loc.cityFr : loc.cityEn;
  const region = REGIONS.find((r) => r.id === loc.regionId);
  const cover = filmLocationCover(loc);
  const KindIcon = KIND_ICONS[filmLocationKind(loc)];
  const kindMeta = FILM_LOCATION_KINDS.find((k) => k.id === filmLocationKind(loc));
  const tourismHref = loc.tourismHref ?? `/destinations/${loc.placeId}`;

  return (
    <div>
      <div className="relative h-56 overflow-hidden sm:h-72 md:h-80">
        {cover ? (
          <Image src={cover} alt="" fill priority className="object-cover" sizes="100vw" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#079941]/40 via-[#0f0f0f] to-[#E30D13]/30">
            <KindIcon className="h-14 w-14 text-[#F5E80C]/70" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-6 sm:px-8">
          <Link
            href="/film/locations"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-[#F5E80C]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('film.locations.back')}
          </Link>
          <h1 className="font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">{name}</h1>
          <p className="mt-1 text-sm text-white/70">
            {city}
            {region ? ` · ${locale === 'fr' ? region.nameFr : region.nameEn}` : ''}
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5E80C] px-3 py-1 text-xs font-bold text-black">
              <KindIcon className="h-3.5 w-3.5" aria-hidden />
              {locale === 'fr' ? kindMeta?.fr : kindMeta?.en}
              {loc.stars ? ` · ${'★'.repeat(Math.min(loc.stars, 5))}` : ''}
            </span>
            {loc.looks.map((lk) => {
              const meta = FILM_LOOKS.find((x) => x.id === lk);
              return (
                <span
                  key={lk}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-[#F5E80C]"
                >
                  {locale === 'fr' ? meta?.fr : meta?.en}
                </span>
              );
            })}
            {loc.alsoTourism ? (
              <span className="rounded-full bg-[#079941]/90 px-3 py-1 text-xs font-bold text-white">
                {t('film.sharedBadge')}
              </span>
            ) : null}
          </div>

          <DetailBlock title={t('film.detail.access')}>
            {locale === 'fr' ? loc.accessFr : loc.accessEn}
          </DetailBlock>
          <DetailBlock title={t('film.detail.power')}>
            {locale === 'fr' ? loc.powerFr : loc.powerEn}
          </DetailBlock>
          <DetailBlock title={t('film.detail.permit')}>
            {locale === 'fr' ? loc.permitFr : loc.permitEn}
          </DetailBlock>
          <DetailBlock title={t('film.detail.practical')}>
            {locale === 'fr' ? loc.practicalFr : loc.practicalEn}
          </DetailBlock>

          {loc.alsoTourism ? (
            <div className="rounded-2xl border border-[#079941]/40 bg-[#079941]/10 px-5 py-5">
              <h2 className="font-display text-lg font-semibold text-[#F8F5ED]">
                {t('film.detail.tourismLinkTitle')}
              </h2>
              <p className="mt-2 text-sm text-white/65">{t('film.detail.tourismLinkBody')}</p>
              <Link
                href={tourismHref}
                onClick={() => setEntryMode('tourism')}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#079941] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#067a34]"
              >
                <Compass className="h-4 w-4" aria-hidden />
                {t('film.detail.openTourism')}
              </Link>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <TourismMap
              markers={[
                {
                  id: loc.placeId,
                  name,
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                },
              ]}
              className="h-64"
            />
          </div>
          {loc.osm ? (
            <PlaceContactCard
              contact={loc.contact}
              city={city}
              latitude={loc.latitude}
              longitude={loc.longitude}
            />
          ) : null}
          <dl className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm">
            <div className="flex justify-between gap-3 border-b border-white/10 py-2">
              <dt className="text-white/45">{t('film.detail.season')}</dt>
              <dd className="font-medium text-[#F8F5ED]">
                {t(`film.season.${loc.season}`)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-white/10 py-2">
              <dt className="text-white/45">{t('film.cost.label')}</dt>
              <dd className="font-medium text-[#F8F5ED]">{t(`film.cost.${loc.costTier}`)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-white/10 py-2">
              <dt className="text-white/45">{t('film.access.label')}</dt>
              <dd className="font-medium text-[#F8F5ED]">
                {t(`film.access.${loc.accessLevel}`)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-white/45">{t('film.detail.coords')}</dt>
              <dd className="font-mono text-xs text-[#F8F5ED]">
                {loc.latitude.toFixed(3)}, {loc.longitude.toFixed(3)}
              </dd>
            </div>
          </dl>
          <a
            href={dossierPdfUrl([loc.slug], locale)}
            download
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#E30D13] px-5 py-3 text-sm font-bold text-white hover:bg-[#B80A0F]"
          >
            <Download className="h-4 w-4" aria-hidden />
            {t('film.dossier.download')}
          </a>
          <p className="text-center text-[11px] text-white/40">{t('film.dossier.hint')}</p>
          {loc.osm ? (
            <p className="text-center text-[10px] text-white/30">{OSM_ATTRIBUTION}</p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#F5E80C]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/75">{children}</p>
    </section>
  );
}
