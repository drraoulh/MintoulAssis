'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckSquare,
  ClipboardList,
  MapPin,
  Users,
  Wrench,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

import { APP_NAME } from '@/lib/config';
import { setEntryMode } from '@/lib/entry-mode';
import { FILM_LOCATIONS, filmLocationCover } from '@/lib/film/locations';
import { useLocale } from '@/lib/i18n';

const EASE = [0.22, 1, 0.36, 1] as const;

const HUB = [
  {
    href: '/film/locations',
    icon: MapPin,
    titleKey: 'film.hub.locations',
    bodyKey: 'film.hub.locationsBody',
  },
  {
    href: '/film/procedures',
    icon: ClipboardList,
    titleKey: 'film.hub.procedures',
    bodyKey: 'film.hub.proceduresBody',
  },
  {
    href: '/film/directory',
    icon: Users,
    titleKey: 'film.hub.directory',
    bodyKey: 'film.hub.directoryBody',
  },
  {
    href: '/film/equipment',
    icon: Wrench,
    titleKey: 'film.hub.equipment',
    bodyKey: 'film.hub.equipmentBody',
  },
  {
    href: '/film/planning',
    icon: CheckSquare,
    titleKey: 'film.hub.planning',
    bodyKey: 'film.hub.planningBody',
  },
] as const;

export default function FilmHomePage() {
  const { t, locale } = useLocale();

  useEffect(() => {
    setEntryMode('film');
  }, []);

  const featured = FILM_LOCATIONS.filter((l) => l.alsoTourism).slice(0, 4);

  return (
    <div>
      <section
        className="relative overflow-hidden border-b border-white/10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(206,17,38,0.35), transparent 50%), radial-gradient(ellipse 60% 50% at 90% 30%, rgba(252,209,22,0.12), transparent 45%), #0a0a0a',
        }}
      >
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-8 sm:py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#FCD116]">
              {APP_NAME} · {t('nav.sectionFilm')}
            </p>
            <h1 className="font-display text-3xl font-bold leading-tight text-[#F8F5ED] sm:text-5xl">
              {t('film.home.title')}
            </h1>
            <p className="mt-4 max-w-xl text-base text-[#F8F5ED]/72 sm:text-lg">
              {t('film.home.sub')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/film/locations"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#CE1126] px-6 py-3 text-sm font-bold text-white hover:bg-[#b50e21]"
              >
                {t('film.home.ctaLocations')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/film/procedures"
                className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-[#F8F5ED] hover:border-[#FCD116] hover:text-[#FCD116]"
              >
                {t('film.home.ctaProcedures')}
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="relative mx-auto w-full max-w-md"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
          >
            <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/10">
              <Image
                src="/places/chutes-de-la-lobe.jpg"
                alt=""
                width={800}
                height={600}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <p className="mt-2 text-center text-xs text-white/45">{t('film.home.heroCaption')}</p>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-14">
        <h2 className="font-display text-2xl font-bold text-[#F8F5ED] sm:text-3xl">
          {t('film.home.toolsTitle')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/55 sm:text-base">
          {t('film.home.toolsSub')}
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HUB.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5 transition hover:border-[#FCD116]/40 hover:bg-white/[0.06]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CE1126]/25 text-[#FCD116]">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="font-display text-lg font-semibold text-[#F8F5ED]">
                  {t(item.titleKey)}
                </span>
                <span className="text-sm text-white/55">{t(item.bodyKey)}</span>
                <span className="mt-auto text-xs font-semibold uppercase tracking-wider text-[#FCD116] opacity-70 group-hover:opacity-100">
                  →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0f0f0f] py-12 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#F8F5ED] sm:text-3xl">
                {t('film.home.sharedTitle')}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/55 sm:text-base">
                {t('film.home.sharedSub')}
              </p>
            </div>
            <Link
              href="/film/locations"
              className="text-sm font-semibold text-[#FCD116] hover:underline"
            >
              {t('film.home.seeAllLocations')}
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((loc) => {
              const cover = filmLocationCover(loc);
              const name = locale === 'fr' ? loc.nameFr : loc.nameEn;
              return (
                <Link
                  key={loc.slug}
                  href={`/film/locations/${loc.slug}`}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-white/5">
                    {cover ? (
                      <Image
                        src={cover}
                        alt=""
                        width={480}
                        height={360}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="px-4 py-3">
                    <p className="font-semibold text-[#F8F5ED]">{name}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {locale === 'fr' ? loc.cityFr : loc.cityEn} · {t('film.sharedBadge')}
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
