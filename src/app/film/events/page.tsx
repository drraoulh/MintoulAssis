'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

import {
  localizeEvent,
  type CinemaEvent,
  type CinemaEventKind,
  type CinemaEventsResponse,
} from '@/lib/film/events';
import { useLocale } from '@/lib/i18n';

const KIND_ORDER: CinemaEventKind[] = [
  'festival',
  'screening',
  'workshop',
  'market',
  'call',
  'other',
];

const FALLBACK_COVER = '/film/hub/events.jpg';

export default function FilmEventsPage() {
  const { t, locale } = useLocale();
  const [data, setData] = useState<CinemaEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<CinemaEventKind | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/film/events${force ? '?refresh=1' : ''}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as CinemaEventsResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('film.events.error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const events = useMemo(() => {
    const list = data?.events ?? [];
    if (kind === 'all') return list;
    return list.filter((e) => e.kind === kind);
  }, [data, kind]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#F5E80C]">
            {t('film.nav.events')}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">
            {t('film.events.title')}
          </h1>
          <p className="mt-3 text-sm text-white/60 sm:text-base">{t('film.events.sub')}</p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading || refreshing}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold text-[#F5E80C] hover:border-[#F5E80C] disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          )}
          {t('film.events.refresh')}
        </button>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-white/45">
        {data?.live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#079941]/25 px-2.5 py-1 font-semibold text-[#F5E80C]">
            <Sparkles className="h-3 w-3" aria-hidden />
            {t('film.events.live')}
            {data.provider !== 'none' ? ` · ${data.provider}` : ''}
          </span>
        ) : (
          <span className="rounded-full bg-white/5 px-2.5 py-1 font-semibold">
            {t('film.events.curatedOnly')}
          </span>
        )}
        {data?.fetchedAt ? (
          <span>
            {t('film.events.updated', {
              when: new Date(data.fetchedAt).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB'),
            })}
          </span>
        ) : null}
      </div>

      {data?.message ? (
        <p className="mt-3 text-sm text-[#F5E80C]/85">{data.message}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Chip active={kind === 'all'} onClick={() => setKind('all')}>
          {t('film.events.allKinds')}
        </Chip>
        {KIND_ORDER.map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
            {t(`film.events.kind.${k}`)}
          </Chip>
        ))}
      </div>

      {loading ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-white/50">
          <Loader2 className="h-8 w-8 animate-spin text-[#F5E80C]" aria-hidden />
          <p className="text-sm">{t('film.events.loading')}</p>
        </div>
      ) : error ? (
        <div className="mt-12 rounded-2xl border border-[#E30D13]/40 bg-[#E30D13]/10 px-5 py-6 text-center">
          <p className="text-sm text-[#F8F5ED]">{t('film.events.error')}</p>
          <p className="mt-1 text-xs text-white/50">{error}</p>
          <button
            type="button"
            onClick={() => void load(true)}
            className="mt-4 rounded-full bg-[#E30D13] px-5 py-2 text-sm font-bold text-white"
          >
            {t('film.events.retry')}
          </button>
        </div>
      ) : events.length === 0 ? (
        <p className="mt-12 text-center text-sm text-white/50">{t('film.events.empty')}</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              locale={locale}
              t={t}
              open={openId === event.id}
              onToggle={() =>
                setOpenId((prev) => (prev === event.id ? null : event.id))
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventCard({
  event,
  locale,
  t,
  open,
  onToggle,
}: {
  event: CinemaEvent;
  locale: 'fr' | 'en';
  t: (key: string, vars?: Record<string, string | number>) => string;
  open: boolean;
  onToggle: () => void;
}) {
  const { title, summary, body } = localizeEvent(event, locale);
  const when =
    event.whenLabel ||
    (event.startDate
      ? new Date(event.startDate).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : t('film.events.dateTbd'));
  const cover = event.imageUrl || FALLBACK_COVER;
  const isRemote = /^https?:\/\//i.test(cover);
  const isBrandLogo = cover.startsWith('/film/events/');
  const detail = body && body.trim().length > 0 ? body : summary;
  const dateRange =
    event.endDate && event.startDate && event.endDate !== event.startDate
      ? ` → ${new Date(event.endDate).toLocaleDateString(
          locale === 'fr' ? 'fr-FR' : 'en-GB',
          { month: 'short', day: 'numeric', year: 'numeric' },
        )}`
      : null;

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div
        className={`relative aspect-[16/9] w-full ${
          isBrandLogo ? 'bg-[#F8F5ED]' : 'bg-black/40'
        }`}
      >
        <Image
          src={cover}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className={isBrandLogo ? 'object-contain p-4' : 'object-cover'}
          unoptimized={isRemote}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#E30D13]/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {t(`film.events.kind.${event.kind}`)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                event.source === 'official'
                  ? 'bg-[#079941]/90 text-[#F5E80C]'
                  : event.source === 'web'
                    ? 'bg-black/55 text-white/85'
                    : 'bg-black/55 text-white/55'
              }`}
            >
              {event.provider === 'icicine'
                ? t('film.events.badgeIcicine')
                : event.source === 'official'
                  ? t('film.events.badgeOfficial')
                  : event.source === 'web'
                    ? t('film.events.badgeLive')
                    : t('film.events.badgeCurated')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-[#F8F5ED]">{title}</h2>
        {!open ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/65">
            {summary}
          </p>
        ) : (
          <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
            <div className="flex flex-wrap gap-3 text-xs text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-[#F5E80C]" aria-hidden />
                <span>
                  {when}
                  {dateRange}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#F5E80C]" aria-hidden />
                {event.venue ? `${event.venue} · ${event.city}` : event.city}
              </span>
            </div>
            <div className="whitespace-pre-line text-sm leading-relaxed text-white/80">
              {detail}
            </div>
          </div>
        )}

        {!open ? (
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/45">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-[#F5E80C]" aria-hidden />
              {when}
              {dateRange}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#F5E80C]" aria-hidden />
              {event.venue ? `${event.venue} · ${event.city}` : event.city}
            </span>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F5E80C] hover:underline"
          >
            {open ? t('film.events.readLess') : t('film.events.readMore')}
            {open ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
          {event.url ? (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white/70"
            >
              {t('film.events.openSource')}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        active ? 'bg-[#E30D13] text-white' : 'bg-white/5 text-white/60'
      }`}
    >
      {children}
    </button>
  );
}
