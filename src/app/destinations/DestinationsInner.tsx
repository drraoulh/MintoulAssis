'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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

/** Aligned with /explorer query params (?category= ?region= ?q=). */
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

export default function DestinationsInner() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resultsRef = useRef<HTMLElement | null>(null);

  const [sites, setSites] = useState<TouristSite[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState<CategoryId>('all');
  const [showMap, setShowMap] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Sync filters from URL (shareable deep links from culture, detail, etc.).
  useEffect(() => {
    setCategory(parseCategory(searchParams.get('category')));
    setRegion(parseRegion(searchParams.get('region')));
    setCity(searchParams.get('city')?.trim() ?? '');
    const q = searchParams.get('q') ?? '';
    setQuery(q);
    setDebouncedQuery(q);
    setVisibleCount(PAGE_SIZE);
  }, [searchParams]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 280);
    return () => clearTimeout(id);
  }, [query]);

  const pushFilters = useCallback(
    (next: {
      region?: string;
      category?: CategoryId;
      q?: string;
      city?: string;
    }) => {
      const params = new URLSearchParams();
      const r = next.region !== undefined ? next.region : region;
      const c = next.category !== undefined ? next.category : category;
      const qq = next.q !== undefined ? next.q : debouncedQuery;
      const ci = next.city !== undefined ? next.city : city;
      if (r) params.set('region', r);
      if (ci) params.set('city', ci);
      if (c && c !== 'all') params.set('category', c);
      if (qq) params.set('q', qq);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [region, category, debouncedQuery, city, pathname, router],
  );

  // Load places via catalog API (region / category / city / q).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cat = CATEGORY_FILTERS.find((f) => f.id === category);
        const res = await listTouristSites({
          region: region || undefined,
          city: city || undefined,
          category: cat?.api,
          q: debouncedQuery || undefined,
          limit: region || city || debouncedQuery ? 72 : 36,
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
  }, [region, category, city, debouncedQuery]);

  // Region counts for the picker.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listTouristSites({ limit: 1, withCounts: true });
        if (!cancelled && res.region_counts) setCounts(res.region_counts);
      } catch {
        /* counts optional */
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

  function selectRegion(apiRegion: string) {
    const next = region === apiRegion ? '' : apiRegion;
    setRegion(next);
    setCity('');
    setVisibleCount(PAGE_SIZE);
    pushFilters({ region: next, city: '' });
    window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function selectCategory(id: CategoryId) {
    setCategory(id);
    setVisibleCount(PAGE_SIZE);
    pushFilters({ category: id });
  }

  function clearFilters() {
    setRegion('');
    setCity('');
    setCategory('all');
    setQuery('');
    setDebouncedQuery('');
    setVisibleCount(PAGE_SIZE);
    router.replace(pathname, { scroll: false });
  }

  const hasActiveFilters = Boolean(
    region || city || category !== 'all' || debouncedQuery,
  );

  const resultsTitle = selectedRegion
    ? locale === 'fr'
      ? selectedRegion.nameFr
      : selectedRegion.nameEn
    : city
      ? t('dest.cityLabel', { city })
      : debouncedQuery
        ? t('explorer.resultsFor', { q: debouncedQuery })
        : category !== 'all'
          ? t(CATEGORY_FILTERS.find((f) => f.id === category)?.labelKey ?? 'explorer.places')
          : t('dest.all');

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <SlideUp>
          <h1 className="font-display text-3xl font-bold text-[var(--green-deep)] sm:text-4xl">
            {t('dest.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            {t('dest.sub')}
          </p>
        </SlideUp>

        {/* Entry — regions */}
        <section className="mt-8" aria-labelledby="dest-regions-heading">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">
                {t('dest.start')}
              </p>
              <h2
                id="dest-regions-heading"
                className="mt-1 font-display text-xl font-semibold text-[var(--green-deep)] sm:text-2xl"
              >
                {t('dest.pickRegion')}
              </h2>
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
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

        {/* Filters + results */}
        <section className="mt-8" ref={resultsRef} aria-labelledby="dest-results-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">
            {t('dest.refine')}
          </p>
          <h2
            id="dest-results-heading"
            className="mt-1 font-display text-xl font-semibold text-[var(--green-deep)] sm:text-2xl"
          >
            {t('dest.searchExplore')}
          </h2>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                className="pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => {
                  if (query.trim() !== debouncedQuery) pushFilters({ q: query.trim() });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') pushFilters({ q: query.trim() });
                }}
                placeholder={
                  selectedRegion
                    ? t('explorer.searchIn', {
                        name: locale === 'fr' ? selectedRegion.nameFr : selectedRegion.nameEn,
                      })
                    : city
                      ? t('dest.searchCity', { city })
                      : t('dest.searchPlaceholder')
                }
                aria-label={t('dest.filterAria')}
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

          {/* Category chips — scrollable on mobile */}
          <div
            className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1"
            role="group"
            aria-label={t('filter.placeType')}
          >
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => selectCategory(f.id)}
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

          {/* Active filter summary */}
          {hasActiveFilters ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
              <span>{t('filter.filters')}</span>
              {selectedRegion ? (
                <span className="rounded-full bg-[var(--mint-soft)] px-2.5 py-0.5 text-[var(--green-deep)]">
                  {locale === 'fr' ? selectedRegion.nameFr : selectedRegion.nameEn}
                </span>
              ) : null}
              {city ? (
                <span className="rounded-full bg-[var(--mint-soft)] px-2.5 py-0.5 text-[var(--green-deep)]">
                  {city}
                </span>
              ) : null}
              {category !== 'all' ? (
                <span className="rounded-full bg-[var(--mint-soft)] px-2.5 py-0.5 text-[var(--green-deep)]">
                  {t(CATEGORY_FILTERS.find((f) => f.id === category)?.labelKey ?? 'filter.all')}
                </span>
              ) : null}
              {debouncedQuery ? (
                <span className="rounded-full bg-[var(--mint-soft)] px-2.5 py-0.5 text-[var(--green-deep)]">
                  « {debouncedQuery} »
                </span>
              ) : null}
            </div>
          ) : null}

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
              ) : (
                <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                  {t('loading.places')}
                </span>
              )}
            </h3>
            {!region && !city && !debouncedQuery && category === 'all' ? (
              <p className="text-sm text-[var(--muted)]">
                {t('dest.pickRegionHint')}
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
                    body={t('dest.emptyBody')}
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                      {t('dest.resetFilters')}
                    </Button>
                    <Button href="/assistant" size="sm">
                      {t('explorer.askGuide')}
                    </Button>
                    <Button href="/explorer" variant="secondary" size="sm">
                      {t('dest.exploreByRegion')}
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
                {loading ? (
                  <div className="flex h-[22rem] items-center justify-center lg:h-[28rem]">
                    <p className="text-sm text-[var(--muted)]">{t('loading.places')}</p>
                  </div>
                ) : (
                  <TourismMap markers={markers} className="h-[22rem] lg:h-[28rem]" />
                )}
                <p className="border-t border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
                  {t('explorer.mapHint')} ·{' '}
                  <Link href="/planifier" className="text-[var(--green)] underline">
                    {t('dest.mapPlan')}
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
          {t('dest.regionsMap')}{' '}
          <Link href="/explorer" className="text-[var(--green)] underline">
            {t('nav.explorer')}
          </Link>
        </p>
      </div>
    </PageTransition>
  );
}
