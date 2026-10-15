'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Map as MapIcon, Search, X } from 'lucide-react';

import { TourismMap } from '@/components/maps/TourismMap';
import { PlaceCard } from '@/components/places/PlaceCard';
import { RegionCoverCard } from '@/components/places/RegionCoverCard';
import { PageTransition, SlideUp } from '@/components/motion';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
} from '@/components/ui';
import { friendlyError, listTouristSites } from '@/lib/api/client';
import { useLocale } from '@/lib/i18n';
import { REGIONS, regionByApiName } from '@/lib/regions';
import { isHotelCategory, sitesToMarkers } from '@/lib/utils/response';
import type { TouristSite } from '@/lib/types';

const PAGE_SIZE = 12;

const CATEGORY_FILTERS = [
  { id: 'all', labelKey: 'filter.all', api: undefined as string | undefined },
  { id: 'sites', labelKey: 'filter.sites', api: 'sites-touristiques' },
  { id: 'restaur', labelKey: 'filter.restaurants', api: 'restauration' },
  { id: 'transports', labelKey: 'filter.transports', api: 'transports' },
] as const;

type CategoryId = (typeof CATEGORY_FILTERS)[number]['id'];

function parseCategory(raw: string | null): CategoryId {
  if (!raw) return 'all';
  const c = raw.toLowerCase();
  if (/sites?|touris|nature|culture|heritage|parc|plage|beach|activity|patrimoine/.test(c)) {
    return 'sites';
  }
  if (/restaur|food|gastro/.test(c)) return 'restaur';
  if (/transport/.test(c)) return 'transports';
  const hit = CATEGORY_FILTERS.find((f) => f.id === c);
  return hit?.id ?? 'all';
}

function parseRegion(raw: string | null): string {
  if (!raw) return '';
  const match = regionByApiName(raw);
  return match?.apiRegion ?? raw;
}

function ExplorerInner() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resultsRef = useRef<HTMLElement | null>(null);

  const region = parseRegion(searchParams.get('region'));
  const category = parseCategory(searchParams.get('category'));
  const urlQuery = searchParams.get('q') ?? '';

  const [sites, setSites] = useState<TouristSite[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(urlQuery);
  const [showMap, setShowMap] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  function writeFilters(patch: {
    region?: string | null;
    category?: CategoryId | null;
    q?: string | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    if ('region' in patch) {
      if (patch.region) params.set('region', patch.region);
      else params.delete('region');
    }
    if ('category' in patch) {
      if (patch.category && patch.category !== 'all') params.set('category', patch.category);
      else params.delete('category');
    }
    if ('q' in patch) {
      const qq = (patch.q ?? '').trim();
      if (qq) params.set('q', qq);
      else params.delete('q');
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Load places — URL is the single source of truth.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cat = CATEGORY_FILTERS.find((f) => f.id === category);
        const preferSites = category === 'all' && !region && !urlQuery;
        const res = await listTouristSites({
          region: region || undefined,
          category: preferSites ? 'sites-touristiques' : cat?.api,
          q: urlQuery || undefined,
          limit: region || urlQuery ? 72 : 24,
        });
        if (cancelled) return;
        const items = res.items.filter((s) => !isHotelCategory(s.category));
        setSites(items);
        setVisibleCount(PAGE_SIZE);
      } catch (e) {
        if (!cancelled) setError(friendlyError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [region, category, urlQuery]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listTouristSites({ limit: 1, withCounts: true });
        if (!cancelled && res.region_counts) setCounts(res.region_counts);
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRegion = useMemo(
    () => (region ? regionByApiName(region) : undefined),
    [region],
  );

  const visible = useMemo(() => sites.slice(0, visibleCount), [sites, visibleCount]);
  const markers = useMemo(() => sitesToMarkers(visible), [visible]);
  const hasMore = visibleCount < sites.length;
  const hasActiveFilters = Boolean(region || category !== 'all' || urlQuery);

  function selectRegion(apiRegion: string) {
    if (region === apiRegion) {
      writeFilters({ region: null });
    } else {
      // Open a region on tourist sites first — restaurants via the chip.
      writeFilters({
        region: apiRegion,
        category: category === 'restaur' || category === 'transports' ? category : 'sites',
      });
    }
    window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }

  const resultsTitle = selectedRegion
    ? locale === 'fr'
      ? selectedRegion.nameFr
      : selectedRegion.nameEn
    : urlQuery
      ? t('explorer.resultsFor', { q: urlQuery })
      : category !== 'all'
        ? t(CATEGORY_FILTERS.find((f) => f.id === category)?.labelKey ?? 'explorer.places')
        : t('explorer.featured');

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <SlideUp>
          <h1 className="font-display text-3xl font-bold text-[var(--green-deep)] sm:text-4xl">
            {t('explorer.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            {t('explorer.subShort')}
          </p>
        </SlideUp>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">
                {t('explorer.step1')}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-[var(--green-deep)] sm:text-2xl">
                {t('explorer.pickRegion')}
              </h2>
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => router.replace(pathname, { scroll: false })}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--green-deep)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                {t('common.reset')}
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5 md:gap-3">
            {REGIONS.map((r) => (
              <RegionCoverCard
                key={r.id}
                region={r}
                count={counts[r.id]}
                locale={locale}
                active={region === r.apiRegion}
                onClick={() => selectRegion(r.apiRegion)}
              />
            ))}
          </div>
        </section>

        <section className="mt-8" ref={resultsRef}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">
            {t('explorer.step2')}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-[var(--green-deep)] sm:text-2xl">
            {t('explorer.refine')}
          </h2>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                className="pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => {
                  if (query.trim() !== urlQuery) writeFilters({ q: query.trim() || null });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') writeFilters({ q: query.trim() || null });
                }}
                placeholder={
                  selectedRegion
                    ? t('explorer.searchIn', {
                        name: locale === 'fr' ? selectedRegion.nameFr : selectedRegion.nameEn,
                      })
                    : t('explorer.searchPlaceholder')
                }
                aria-label={t('explorer.searchAria')}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowMap((v) => !v)}
            >
              <MapIcon className="h-4 w-4" aria-hidden />
              {showMap ? t('common.hideMap') : t('common.map')}
            </Button>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => writeFilters({ category: f.id })}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  category === f.id
                    ? 'bg-[var(--green-deep)] text-white'
                    : 'border border-[var(--line)] bg-white text-[var(--muted)] hover:border-[var(--gold)]'
                }`}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mt-6">
              <ErrorState message={error} />
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-[var(--green-deep)] sm:text-xl">
              {resultsTitle}
              {!loading ? (
                <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                  {sites.length > 1
                    ? t('explorer.placeCountPlural', { n: sites.length })
                    : t('explorer.placeCount', { n: sites.length })}
                  {hasMore ? ` · ${t('explorer.shown', { n: visible.length })}` : ''}
                </span>
              ) : null}
            </h3>
            {!region && !urlQuery && category === 'all' ? (
              <p className="text-sm text-[var(--muted)]">
                {t('explorer.pickRegionHint')}
              </p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="grid gap-4 sm:grid-cols-2">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-64 w-full" />
                    ))
                  : visible.map((site) => (
                      <PlaceCard key={site.id} site={site} compact />
                    ))}
              </div>

              {!loading && !sites.length ? (
                <div className="mt-4">
                  <EmptyState
                    title={t('empty.places')}
                    body={t('explorer.emptyBody')}
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.replace(pathname, { scroll: false })}
                    >
                      {t('explorer.seeSuggestions')}
                    </Button>
                    <Button href="/assistant" size="sm">
                      {t('explorer.askGuide')}
                    </Button>
                  </div>
                </div>
              ) : null}

              {!loading && hasMore ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  >
                    {t('explorer.showMore', { n: sites.length - visible.length })}
                  </Button>
                </div>
              ) : null}
            </div>

            <div className={`${showMap ? 'block' : 'hidden'} lg:block`}>
              <div className="sticky top-24 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[var(--shadow-soft)]">
                <TourismMap markers={markers} className="h-[22rem] lg:h-[28rem]" />
                <p className="border-t border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
                  {t('explorer.mapHint')} ·{' '}
                  <Link href="/assistant" className="text-[var(--green)] underline">
                    {t('explorer.needItinerary')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        <p className="mt-10 text-sm text-[var(--muted)]">
          {t('explorer.hotelsLink')}{' '}
          <Link href="/hotels" className="text-[var(--green)] underline">
            {t('explorer.hotelsPage')}
          </Link>
          {' · '}
          {t('explorer.cultureLink')}{' '}
          <Link href="/culture" className="text-[var(--green)] underline">
            {t('explorer.culturePage')}
          </Link>
        </p>
      </div>
    </PageTransition>
  );
}

export default function ExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-12">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-8 h-40 w-full" />
          <Skeleton className="mt-6 h-80 w-full" />
        </div>
      }
    >
      <ExplorerInner />
    </Suspense>
  );
}
