'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Compass,
  Hotel,
  Mic,
  Mountain,
  Sparkles,
  Utensils,
} from 'lucide-react';
import Link from 'next/link';

import { PlaceCard } from '@/components/places/PlaceCard';
import { RegionCoverGrid } from '@/components/places/RegionCoverCard';
import { Button, Skeleton } from '@/components/ui';
import { SmartMboaIntro, hasSeenIntro } from '@/components/intro/SmartMboaIntro';
import { clearIntroSeen } from '@/lib/intro';
import { listTouristSites } from '@/lib/api/client';
import { APP_NAME } from '@/lib/config';
import { useLocale } from '@/lib/i18n';
import { MUST_SEE_IDS, resolvePlaceImage } from '@/lib/place-images';
import { REGIONS } from '@/lib/regions';
import { isHotelCategory } from '@/lib/utils/response';
import { isTouristAttraction } from '@/lib/utils/text';
import type { TouristSite } from '@/lib/types';

const INTENTS = [
  {
    href: '/explorer?category=sites',
    labelKey: 'home.intent.sites',
    hintKey: 'home.intent.sitesHint',
    icon: Mountain,
  },
  {
    href: '/explorer?category=restaur',
    labelKey: 'home.intent.restaurants',
    hintKey: 'home.intent.restaurantsHint',
    icon: Utensils,
  },
  {
    href: '/explorer',
    labelKey: 'home.intent.region',
    hintKey: 'home.intent.regionHint',
    icon: Compass,
  },
  {
    href: '/hotels',
    labelKey: 'home.intent.hotels',
    hintKey: 'home.intent.hotelsHint',
    icon: Hotel,
  },
] as const;

export default function HomePage() {
  const { t } = useLocale();
  const router = useRouter();
  /** null = deciding; true = play intro; false = home */
  const [showIntro, setShowIntro] = useState<boolean | null>(null);
  const [q, setQ] = useState('');
  const [allPlaces, setAllPlaces] = useState<TouristSite[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const onIntroComplete = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    const forceReplay = new URLSearchParams(window.location.search).has('reset_intro');
    if (forceReplay) {
      clearIntroSeen();
      setShowIntro(true);
      router.replace('/');
      return;
    }
    setShowIntro(!hasSeenIntro());
  }, [router]);

  useEffect(() => {
    const playing = showIntro === true || showIntro === null;
    document.documentElement.classList.toggle('intro-playing', playing);
    return () => document.documentElement.classList.remove('intro-playing');
  }, [showIntro]);

  useEffect(() => {
    if (showIntro !== false) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await listTouristSites();
        if (cancelled) return;
        const sites = res.items.filter((s) => !isHotelCategory(s.category));
        setAllPlaces(sites);
        const next: Record<string, number> = {};
        for (const r of REGIONS) {
          next[r.id] = res.items.filter(
            (s) => s.region.trim().toLowerCase() === r.apiRegion.trim().toLowerCase(),
          ).length;
        }
        setCounts(next);
      } catch {
        /* empty — home still usable */
      } finally {
        if (!cancelled) setLoadingPlaces(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showIntro]);

  const mustSee = useMemo(() => {
    const byId = new Map(allPlaces.map((p) => [p.id, p]));
    const ordered: TouristSite[] = [];
    for (const id of MUST_SEE_IDS) {
      const hit = byId.get(id);
      if (hit) ordered.push(hit);
    }
    if (ordered.length >= 6) return ordered.slice(0, 8);
    const extras = allPlaces.filter(
      (p) =>
        !ordered.some((o) => o.id === p.id) &&
        resolvePlaceImage(p) &&
        isTouristAttraction(p.category),
    );
    return [...ordered, ...extras].slice(0, 8);
  }, [allPlaces]);

  function onAsk(e: FormEvent) {
    e.preventDefault();
    const message = q.trim();
    if (message) {
      router.push(`/assistant?q=${encodeURIComponent(message)}`);
    } else {
      router.push('/assistant');
    }
  }

  if (showIntro === null) {
    return <div className="fixed inset-0 z-[100] bg-[#050505]" aria-hidden />;
  }

  return (
    <>
      {showIntro ? <SmartMboaIntro onComplete={onIntroComplete} /> : null}

      <div className={showIntro ? 'hidden' : ''}>
        <section className="relative overflow-hidden bg-gradient-to-br from-white via-[var(--mint-soft)] to-[#FCD116]/30">
          <div className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-8 px-4 py-10 sm:gap-10 sm:px-8 sm:py-14 md:flex-row md:gap-6 md:py-16 lg:px-12">
            <div className="w-full min-w-0 md:w-1/2">
              <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)] md:text-left">
                {APP_NAME}
              </p>
              <h1 className="text-center text-[1.7rem] font-bold leading-tight tracking-tight text-[var(--ink)] sm:text-4xl md:text-left lg:text-[2.75rem] lg:leading-[1.1]">
                {t('home.welcome')}{' '}
                <span className="text-[#CE1126]">Cameroun</span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-center text-base text-[var(--muted)] sm:text-lg md:mx-0 md:text-left">
                {t('home.sub')}
              </p>
              <div className="mt-6 flex w-full flex-col gap-3 sm:mt-8 sm:flex-row">
                <Link
                  href="/explorer"
                  className="w-full rounded-full bg-[var(--green-deep)] px-6 py-3 text-center text-base font-bold text-white shadow-md hover:bg-[#00614b] sm:w-auto sm:px-8"
                >
                  {t('home.ctaPlaces')}
                </Link>
                <Link
                  href="/assistant"
                  className="w-full rounded-full bg-white px-6 py-3 text-center text-base font-bold text-[#CE1126] shadow-md ring-1 ring-[#CE1126]/20 hover:bg-[#fff6f6] sm:w-auto sm:px-8"
                >
                  {t('home.ctaGuide')}
                </Link>
              </div>
              <form
                onSubmit={onAsk}
                className="mt-6 flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--line)] bg-white p-1.5 shadow-lg sm:mt-8 sm:gap-2 sm:p-2"
              >
                <label className="sr-only" htmlFor="home-ask">
                  {t('home.askLabel')}
                </label>
                <input
                  id="home-ask"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('home.askPlaceholder')}
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
                />
                <button
                  type="button"
                  aria-label={t('home.mic')}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FCD116] text-[var(--ink)] hover:brightness-95"
                  onClick={() => router.push('/assistant?voice=1')}
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  type="submit"
                  aria-label={t('home.send')}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--green-deep)] text-white hover:bg-[#00614b]"
                >
                  <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            </div>
            <div className="relative flex w-full max-w-md justify-center md:max-w-none md:w-1/2">
              <div
                className="absolute inset-4 rounded-full bg-gradient-to-tl from-transparent via-[#FCD116] to-[#CE1126] opacity-70 sm:inset-6"
                aria-hidden
              />
              <Image
                src="/brand/logo.png"
                alt={APP_NAME}
                width={475}
                height={378}
                priority
                className="relative z-10 h-44 w-auto max-w-[min(100%,18rem)] object-contain drop-shadow-xl sm:h-64 sm:max-w-none md:h-72"
              />
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--line)] bg-white py-10 sm:py-12">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <h2 className="text-center font-display text-2xl font-bold text-[var(--green-deep)] sm:text-3xl">
              {t('home.startTitle')}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-sm text-[var(--muted)] sm:text-base">
              {t('home.startSub')}
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {INTENTS.map((intent) => {
                const Icon = intent.icon;
                return (
                  <Link
                    key={intent.href}
                    href={intent.href}
                    className="group flex flex-col gap-2 rounded-2xl border border-[var(--line)] bg-[var(--mint-soft)]/50 px-4 py-5 transition hover:border-[var(--green)] hover:bg-[var(--mint-soft)]"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--green-deep)] shadow-sm">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="font-display text-lg font-semibold text-[var(--green-deep)]">
                      {t(intent.labelKey)}
                    </span>
                    <span className="text-sm text-[var(--muted)]">{t(intent.hintKey)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 md:px-8 sm:py-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-[var(--green-deep)] sm:text-3xl">
                {t('home.mustSee')}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)] sm:text-base">
                {t('home.mustSeeSub')}
              </p>
            </div>
            <Button href="/explorer" variant="outline" className="hidden shrink-0 sm:inline-flex">
              {t('home.seeMore')}
            </Button>
          </div>

          <div className="mt-6 flex gap-4 overflow-x-auto no-scrollbar pb-2 snap-x">
            {loadingPlaces
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 w-64 shrink-0 rounded-2xl" />
                ))
              : mustSee.map((site) => (
                  <PlaceCard key={site.id} site={site} featured compact />
                ))}
          </div>
          {!loadingPlaces && mustSee.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              {t('home.emptyCatalog')}{' '}
              <Link href="/assistant" className="font-semibold text-[var(--green)] underline">
                {t('home.askGuide')}
              </Link>
            </p>
          ) : null}
          <div className="mt-4 sm:hidden">
            <Button href="/explorer" variant="outline" className="w-full">
              {t('home.seeMorePlaces')}
            </Button>
          </div>
        </section>

        <section id="regions" className="scroll-mt-24 bg-[var(--mint-soft)]/40 py-12 sm:py-14">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-[var(--green-deep)] sm:text-3xl">
                  {t('home.regions')}
                </h2>
                <p className="mt-2 max-w-xl text-sm text-[var(--muted)] sm:text-base">
                  {t('home.regionsSub')}
                </p>
              </div>
              <Link
                href="/explorer"
                className="hidden items-center gap-1 text-sm font-semibold text-[var(--green)] sm:inline-flex"
              >
                <Compass className="h-4 w-4" aria-hidden />
                {t('nav.explorer')}
              </Link>
            </div>
            <div className="mt-8">
              <RegionCoverGrid counts={counts} />
            </div>
          </div>
        </section>

        <section className="bg-[var(--green-deep)] px-4 py-14 text-white sm:py-16 md:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FCD116]/25">
              <Sparkles className="h-6 w-6 text-[#FCD116]" aria-hidden />
            </span>
            <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">
              {t('home.guideTitle')}
            </h2>
            <p className="mt-3 max-w-lg text-white/85">
              {t('home.guideBody', { app: APP_NAME })}
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button href="/assistant" variant="gold" size="lg" className="w-full sm:w-auto">
                {t('home.openAssistant')}
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Button>
              <Button href="/planifier" variant="ghost" size="lg" className="w-full sm:w-auto">
                {t('hero.ctaPlan')}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
