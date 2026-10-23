'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  CheckSquare,
  ClipboardList,
  Columns2,
  GraduationCap,
  MapPin,
  Theater,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { FilmAudienceGateway } from '@/components/film/FilmAudienceGateway';
import { setEntryMode } from '@/lib/entry-mode';
import {
  clearFilmAudience,
  getFilmAudience,
  setFilmAudience,
  type FilmAudience,
} from '@/lib/film/audience';
import { FILM_LOCATIONS, filmLocationCover } from '@/lib/film/locations';
import { useLocale } from '@/lib/i18n';

const EASE = [0.22, 1, 0.36, 1] as const;

type HubItem = {
  href: string;
  icon: LucideIcon;
  titleKey: string;
  bodyKey: string;
  image?: string;
};

const SHARED_HUB: HubItem[] = [
  {
    href: '/film/locations',
    icon: MapPin,
    titleKey: 'film.hub.locations',
    bodyKey: 'film.hub.locationsBody',
    image: '/film/hub/locations.jpg',
  },
  {
    href: '/film/halls',
    icon: Theater,
    titleKey: 'film.hub.halls',
    bodyKey: 'film.hub.hallsBody',
    image: '/film/hub/halls.png',
  },
  {
    href: '/film/events',
    icon: CalendarDays,
    titleKey: 'film.hub.events',
    bodyKey: 'film.hub.eventsBody',
    image: '/film/hub/events.jpg',
  },
  {
    href: '/film/procedures',
    icon: ClipboardList,
    titleKey: 'film.hub.procedures',
    bodyKey: 'film.hub.proceduresBody',
    image: '/film/hub/procedures.jpg',
  },
  {
    href: '/film/directory',
    icon: Users,
    titleKey: 'film.hub.directory',
    bodyKey: 'film.hub.directoryBody',
    image: '/film/hub/directory.jpg',
  },
  {
    href: '/film/equipment',
    icon: Wrench,
    titleKey: 'film.hub.equipment',
    bodyKey: 'film.hub.equipmentBody',
    image: '/film/hub/equipment.jpg',
  },
  {
    href: '/film/rentals',
    icon: CarFront,
    titleKey: 'film.hub.rentals',
    bodyKey: 'film.hub.rentalsBody',
  },
  {
    href: '/film/planning',
    icon: CheckSquare,
    titleKey: 'film.hub.planning',
    bodyKey: 'film.hub.planningBody',
    image: '/film/hub/planning.jpg',
  },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Running SMPTE-style timecode for the viewfinder overlay. */
function useTimecode() {
  const [tc, setTc] = useState('00:00:00:00');
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const ms = Date.now() - start;
      const frames = Math.floor((ms % 1000) / (1000 / 24));
      const s = Math.floor(ms / 1000);
      setTc(`${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(frames)}`);
    }, 1000 / 24);
    return () => clearInterval(id);
  }, []);
  return tc;
}

export default function FilmHomePage() {
  const { t, locale } = useLocale();
  const [audience, setAudience] = useState<FilmAudience | null | 'loading'>('loading');
  const timecode = useTimecode();

  useEffect(() => {
    setEntryMode('film');
    const params = new URLSearchParams(window.location.search);
    if (params.has('change_audience')) {
      clearFilmAudience();
      setAudience(null);
      window.history.replaceState({}, '', '/film');
      return;
    }
    setAudience(getFilmAudience());
  }, []);

  const onAudienceSelect = useCallback((next: FilmAudience) => {
    setFilmAudience(next);
    setAudience(next);
  }, []);

  if (audience === 'loading') {
    return <div className="min-h-[100svh] bg-[#070707]" aria-hidden />;
  }

  if (!audience) {
    return <FilmAudienceGateway onSelect={onAudienceSelect} />;
  }

  const fr = locale === 'fr';
  const isIntl = audience === 'international';
  const featured = FILM_LOCATIONS.filter((l) => l.alsoTourism).slice(0, 6);
  const hub: HubItem[] = [
    ...SHARED_HUB,
    isIntl
      ? {
          href: '/film/locations/compare',
          icon: Columns2,
          titleKey: 'film.hub.compare',
          bodyKey: 'film.hub.compareBody',
        }
      : {
          href: '/film/resources',
          icon: GraduationCap,
          titleKey: 'film.hub.resources',
          bodyKey: 'film.hub.resourcesBody',
          image: '/film/hub/resources.jpg',
        },
  ];

  return (
    <div>
      {/* ── Opening title: logo framed in a camera viewfinder, letterboxed ── */}
      <section className="relative isolate overflow-hidden bg-black">
        <Image
          src="/film/hub/equipment.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover opacity-35 grayscale-[35%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 75% 70% at 70% 50%, transparent 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.95) 100%), linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.25) 100%)',
          }}
        />
        {/* Letterbox bars */}
        <div aria-hidden className="h-6 bg-black sm:h-10" />

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-10 sm:px-8 sm:py-16 md:grid-cols-[1.05fr_0.95fr] md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <p className="cine-kicker">
              {isIntl ? t('film.audience.intl') : t('film.audience.local')}
            </p>
            <h1 className="font-display mt-5 text-[2.9rem] text-[#F8F5ED] min-[400px]:text-[3.4rem] sm:text-7xl lg:text-[5.4rem]">
              {isIntl ? t('film.home.intlTitle') : t('film.home.localTitle')}
            </h1>
            <p className="font-cine-serif mt-5 max-w-xl text-xl italic leading-snug text-[#F8F5ED]/80 sm:text-2xl">
              {isIntl ? t('film.home.intlSub') : t('film.home.localSub')}
            </p>
            <div className="mt-9 flex flex-col gap-3 min-[460px]:flex-row min-[460px]:flex-wrap">
              <Link href="/film/locations" className="cine-btn">
                {t('film.home.ctaLocations')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/film/procedures" className="cine-btn-ghost">
                {t('film.home.ctaProcedures')}
              </Link>
              <Link
                href={isIntl ? '/film/locations/compare' : '/film/resources'}
                className="cine-btn-ghost"
              >
                {isIntl ? t('film.home.ctaCompare') : t('film.home.ctaResources')}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => {
                clearFilmAudience();
                setAudience(null);
              }}
              className="mt-6 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40 hover:text-[#F5E80C]"
            >
              {t('film.audience.switch')}
            </button>
          </motion.div>

          <motion.div
            className="order-first md:order-none"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.15, ease: EASE }}
          >
            <div className="cine-viewfinder mx-auto aspect-[4/3] w-full max-w-[22rem] sm:max-w-md">
              <span className="vf-corner vf-tl" />
              <span className="vf-corner vf-tr" />
              <span className="vf-corner vf-bl" />
              <span className="vf-corner vf-br" />
              <div className="absolute inset-x-4 top-3 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-white/70">
                <span className="flex items-center gap-1.5">
                  <span className="cine-rec-dot h-2 w-2 rounded-full bg-[#E30D13]" />
                  REC
                </span>
                <span>4K · 24 FPS</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center px-10 py-10">
                <Image
                  src="/brand/logo-cinema.png"
                  alt="SmartMboa Cinéma"
                  width={1010}
                  height={761}
                  priority
                  sizes="(min-width: 768px) 380px, 280px"
                  className="h-auto max-h-full w-full object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.85)]"
                />
              </div>
              <div className="absolute inset-x-4 bottom-3 flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-white/60">
                <span>TC {timecode}</span>
                <span>ISO 800 · 5600K</span>
              </div>
            </div>
          </motion.div>
        </div>

        <div aria-hidden className="h-6 bg-black sm:h-10" />
      </section>

      {/* ── Production desk: numbered poster cards ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="cine-kicker">{fr ? 'Sommaire' : 'Contents'}</p>
            <h2 className="font-display mt-4 text-5xl text-[#F8F5ED] sm:text-6xl">
              {t('film.home.toolsTitle')}
            </h2>
          </div>
          <p className="font-cine-serif max-w-md text-lg italic text-white/60 md:text-right">
            {t('film.home.oneSystem')}
          </p>
        </div>

        <div className="mt-10 grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {hub.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex min-h-[19rem] flex-col justify-end overflow-hidden bg-[#0b0b0b] p-6 sm:min-h-[21rem]"
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    loading={index < 3 ? 'eager' : 'lazy'}
                    className="object-cover opacity-55 grayscale-[45%] transition duration-700 group-hover:scale-105 group-hover:opacity-75 group-hover:grayscale-0"
                  />
                ) : (
                  <Icon
                    className="absolute right-6 top-6 h-24 w-24 stroke-[0.8] text-white/[0.07] transition group-hover:text-[#F5E80C]/20"
                    aria-hidden
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
                <span className="font-display absolute left-6 top-5 text-2xl text-[#F5E80C]/90">
                  {pad(index + 1)}
                </span>
                <ArrowUpRight
                  className="absolute right-5 top-5 h-5 w-5 text-white/40 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#F5E80C]"
                  aria-hidden
                />
                <div className="relative">
                  <span className="mb-3 block h-px w-10 bg-[#F5E80C] transition-all duration-500 group-hover:w-20" />
                  <h3 className="font-display text-3xl text-[#F8F5ED]">{t(item.titleKey)}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/65">{t(item.bodyKey)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Featured locations on a 35mm strip ── */}
      <section className="border-t border-white/10 py-16 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 sm:px-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="cine-kicker">{fr ? 'Repérages' : 'Scouting'}</p>
            <h2 className="font-display mt-4 text-5xl text-[#F8F5ED] sm:text-6xl">
              {t('film.home.sharedTitle')}
            </h2>
            <p className="font-cine-serif mt-3 max-w-xl text-lg italic text-white/60">
              {t('film.home.sharedSub')}
            </p>
          </div>
          <Link href="/film/locations" className="cine-btn-ghost self-start md:self-auto">
            {t('film.home.seeAllLocations')}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="cine-filmstrip mt-10">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 sm:px-8">
            {featured.map((loc, i) => {
              const cover = filmLocationCover(loc);
              const name = fr ? loc.nameFr : loc.nameEn;
              return (
                <Link
                  key={loc.slug}
                  href={`/film/locations/${loc.slug}`}
                  className="group relative aspect-[3/2] w-[78vw] max-w-[26rem] shrink-0 snap-start overflow-hidden bg-black sm:w-[22rem]"
                >
                  {cover ? (
                    <Image
                      src={cover}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 352px, 78vw"
                      className="object-cover grayscale-[30%] transition duration-700 group-hover:scale-105 group-hover:grayscale-0"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <span className="absolute left-3 top-2 font-mono text-[10px] tracking-[0.2em] text-[#F5E80C]/80">
                    {`SC ${pad(i + 1)}`}
                  </span>
                  <div className="absolute inset-x-4 bottom-3">
                    <p className="font-display text-2xl text-[#F8F5ED]">{name}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">
                      {fr ? loc.cityFr : loc.cityEn} · {t('film.sharedBadge')}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
