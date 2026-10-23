'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Columns2, Download } from 'lucide-react';

import { dossierPdfUrl } from '@/lib/film/dossier';
import {
  FILM_LOCATION_KINDS,
  FILM_LOCATIONS,
  FILM_LOOKS,
  filmLocationCover,
  filmLocationKind,
} from '@/lib/film/locations';
import { useLocale } from '@/lib/i18n';

export default function FilmComparePage() {
  const { t, locale } = useLocale();
  const [a, setA] = useState(FILM_LOCATIONS[0]?.slug ?? '');
  const [b, setB] = useState(FILM_LOCATIONS[1]?.slug ?? '');

  const left = useMemo(() => FILM_LOCATIONS.find((l) => l.slug === a), [a]);
  const right = useMemo(() => FILM_LOCATIONS.find((l) => l.slug === b), [b]);

  const bothSlugs = [left?.slug, right?.slug].filter((x): x is string => Boolean(x));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="max-w-2xl">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#F5E80C]">
          {t('film.compare.eyebrow')}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">
          {t('film.compare.title')}
        </h1>
        <p className="mt-3 text-sm text-white/60 sm:text-base">{t('film.compare.sub')}</p>
      </header>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-xs font-semibold uppercase tracking-wide text-white/45">
          {t('film.compare.locationA')}
          <select
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-normal normal-case text-[#F8F5ED]"
          >
            <LocationOptions locale={locale} />
          </select>
        </label>
        <label className="flex-1 text-xs font-semibold uppercase tracking-wide text-white/45">
          {t('film.compare.locationB')}
          <select
            value={b}
            onChange={(e) => setB(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-normal normal-case text-[#F8F5ED]"
          >
            <LocationOptions locale={locale} />
          </select>
        </label>
        <a
          href={dossierPdfUrl(bothSlugs, locale)}
          download
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E30D13] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#B80A0F]"
        >
          <Download className="h-4 w-4" aria-hidden />
          {t('film.compare.download')}
        </a>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {left ? <CompareCard loc={left} locale={locale} t={t} /> : null}
        {right ? <CompareCard loc={right} locale={locale} t={t} /> : null}
      </div>

      <p className="mt-8 flex items-center gap-2 text-xs text-white/40">
        <Columns2 className="h-3.5 w-3.5" aria-hidden />
        {t('film.compare.note')}
      </p>
    </div>
  );
}

function CompareCard({
  loc,
  locale,
  t,
}: {
  loc: (typeof FILM_LOCATIONS)[number];
  locale: 'fr' | 'en';
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const cover = filmLocationCover(loc);
  const name = locale === 'fr' ? loc.nameFr : loc.nameEn;

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="relative aspect-[16/9] bg-white/5">
        {cover ? (
          <Image src={cover} alt="" fill className="object-cover" sizes="50vw" />
        ) : null}
      </div>
      <div className="space-y-3 px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold text-[#F8F5ED]">{name}</h2>
            <p className="text-sm text-white/50">
              {locale === 'fr' ? loc.cityFr : loc.cityEn}
            </p>
          </div>
          <Link
            href={`/film/locations/${loc.slug}`}
            className="text-xs font-semibold text-[#F5E80C] hover:underline"
          >
            {t('film.compare.open')}
          </Link>
        </div>
        <dl className="grid gap-2 text-sm">
          <Row label={t('film.detail.season')} value={t(`film.season.${loc.season}`)} />
          <Row label={t('film.cost.label')} value={t(`film.cost.${loc.costTier}`)} />
          <Row label={t('film.access.label')} value={t(`film.access.${loc.accessLevel}`)} />
          <Row
            label={t('film.compare.looks')}
            value={loc.looks
              .map((id) => {
                const m = FILM_LOOKS.find((x) => x.id === id);
                return locale === 'fr' ? m?.fr : m?.en;
              })
              .filter(Boolean)
              .join(', ')}
          />
          <Row
            label={t('film.detail.power')}
            value={locale === 'fr' ? loc.powerFr : loc.powerEn}
          />
          <Row
            label={t('film.detail.access')}
            value={locale === 'fr' ? loc.accessFr : loc.accessEn}
          />
          <Row
            label={t('film.detail.permit')}
            value={locale === 'fr' ? loc.permitFr : loc.permitEn}
          />
        </dl>
        <a
          href={dossierPdfUrl([loc.slug], locale)}
          download
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold text-[#F5E80C] hover:border-[#F5E80C]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {t('film.dossier.download')}
        </a>
      </div>
    </article>
  );
}

function LocationOptions({ locale }: { locale: 'fr' | 'en' }) {
  return (
    <>
      {FILM_LOCATION_KINDS.map((k) => {
        const items = FILM_LOCATIONS.filter((l) => filmLocationKind(l) === k.id);
        if (!items.length) return null;
        return (
          <optgroup key={k.id} label={locale === 'fr' ? k.fr : k.en}>
            {items.map((l) => (
              <option key={l.slug} value={l.slug}>
                {locale === 'fr' ? l.nameFr : l.nameEn}
                {l.kind && l.kind !== 'site' && l.cityFr ? ` — ${l.cityFr}` : ''}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-white/10 pt-2">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-[#F5E80C]/80">
        {label}
      </dt>
      <dd className="mt-0.5 text-white/75">{value}</dd>
    </div>
  );
}
