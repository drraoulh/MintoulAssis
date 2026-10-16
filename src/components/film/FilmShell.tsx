'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  CalendarDays,
  CheckSquare,
  Clapperboard,
  ClipboardList,
  Columns2,
  GraduationCap,
  Home,
  LayoutGrid,
  MapPin,
  Menu,
  Sparkles,
  Theater,
  UserCircle2,
  Users,
  Wrench,
  X,
} from 'lucide-react';

import { FilmSectionSwitcher } from '@/components/entry/SectionSwitcher';
import { APP_NAME } from '@/lib/config';
import { useLocale } from '@/lib/i18n';

const FILM_LINKS = [
  { href: '/film', key: 'film.nav.home', icon: Home, exact: true },
  { href: '/film/assistant', key: 'film.nav.assistant', icon: Sparkles },
  { href: '/film/locations', key: 'film.nav.locations', icon: MapPin },
  { href: '/film/halls', key: 'film.nav.halls', icon: Theater },
  { href: '/film/events', key: 'film.nav.events', icon: CalendarDays },
  { href: '/film/procedures', key: 'film.nav.procedures', icon: ClipboardList },
  { href: '/film/directory', key: 'film.nav.directory', icon: Users },
  { href: '/film/equipment', key: 'film.nav.equipment', icon: Wrench },
  { href: '/film/planning', key: 'film.nav.planning', icon: CheckSquare },
  { href: '/film/locations/compare', key: 'film.nav.compare', icon: Columns2 },
  { href: '/film/resources', key: 'film.nav.resources', icon: GraduationCap },
  { href: '/film/profile', key: 'film.nav.profile', icon: UserCircle2 },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function FilmShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAssistant =
    pathname === '/film/assistant' || pathname.startsWith('/film/assistant/');

  return (
    <div
      className={`flex bg-[#0a0a0a] text-[#F8F5ED] ${
        isAssistant
          ? 'h-[100dvh] min-h-[100dvh] flex-col overflow-hidden'
          : 'min-h-[100svh] flex-col'
      }`}
    >
      <FilmHeader />
      <main
        className={
          isAssistant
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0'
            : 'flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0'
        }
      >
        {children}
      </main>
      <FilmBottomNav />
    </div>
  );
}

function FilmHeader() {
  const { t, locale, toggleLocale } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="sticky top-0 z-50">
      <div className="flex h-1.5" aria-hidden>
        <div className="flex-1 bg-[#007A5E]" />
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-[#FCD116]" />
      </div>
      <div className="bg-[#1a0a0c] px-3 py-1 text-center text-[11px] font-semibold text-[#FCD116]/90 sm:text-xs">
        {t('film.banner')}
      </div>
      <header className="border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 md:px-8">
          <Link href="/film" className="flex min-w-0 items-center gap-2" aria-label={APP_NAME}>
            <Image
              src="/brand/logo.png"
              alt=""
              width={475}
              height={378}
              priority
              className="h-9 w-auto max-w-[7.5rem] object-contain sm:h-11 sm:max-w-none"
            />
            <span className="hidden items-center gap-1.5 rounded-full bg-[#CE1126]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FCD116] sm:inline-flex">
              <Clapperboard className="h-3 w-3" aria-hidden />
              {t('nav.sectionFilm')}
            </span>
          </Link>

          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <nav className="flex items-center gap-1" aria-label={t('film.nav.primary')}>
              {FILM_LINKS.filter((l) =>
                [
                  '/film',
                  '/film/assistant',
                  '/film/locations',
                  '/film/halls',
                  '/film/events',
                ].includes(l.href),
              ).map((link) => {
                const active = isActive(pathname, link.href, 'exact' in link ? link.exact : false);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-white/10 text-[#FCD116]'
                        : 'text-white/65 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {t(link.key)}
                  </Link>
                );
              })}
            </nav>
            <FilmSectionSwitcher />
            <button
              type="button"
              onClick={toggleLocale}
              className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-bold uppercase text-white/80"
              aria-label={t('nav.lang')}
            >
              {locale === 'fr' ? 'EN' : 'FR'}
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <FilmSectionSwitcher className="hidden min-[420px]:inline-flex" />
            <button
              type="button"
              onClick={toggleLocale}
              className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-bold uppercase text-white/80"
            >
              {locale === 'fr' ? 'EN' : 'FR'}
            </button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white"
              aria-label={open ? t('nav.menuClose') : t('nav.menuOpen')}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open ? (
          <div className="border-t border-white/10 bg-[#0f0f0f] px-3 py-3 lg:hidden">
            <div className="mb-3 min-[420px]:hidden">
              <FilmSectionSwitcher size="md" className="w-full justify-center" />
            </div>
            <div className="flex flex-col gap-1">
              {FILM_LINKS.map((link) => {
                const Icon = link.icon;
                const active = isActive(pathname, link.href, 'exact' in link ? link.exact : false);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                      active ? 'bg-white/10 text-[#FCD116]' : 'text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {t(link.key)}
                  </Link>
                );
              })}
              <Link
                href="/?change_mode=1"
                onClick={() => setOpen(false)}
                className="mt-1 rounded-xl px-3 py-2 text-xs text-white/50"
              >
                {t('nav.changeMode')}
              </Link>
            </div>
          </div>
        ) : null}
      </header>
    </div>
  );
}

function FilmBottomNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();

  const tabs = useMemo(
    () =>
      [
        { href: '/film', label: t('film.nav.home'), icon: Home, exact: true as const },
        { href: '/film/assistant', label: t('film.nav.assistantShort'), icon: Sparkles },
        { href: '/film/halls', label: t('film.nav.hallsShort'), icon: Theater },
        { href: '/film/events', label: t('film.nav.eventsShort'), icon: CalendarDays },
      ] as const,
    [t],
  );

  const moreLinks = useMemo(
    () =>
      [
        { href: '/film/locations', label: t('film.nav.locations'), icon: MapPin },
        { href: '/film/directory', label: t('film.nav.directory'), icon: Building2 },
        { href: '/film/procedures', label: t('film.nav.procedures'), icon: ClipboardList },
        { href: '/film/equipment', label: t('film.nav.equipment'), icon: Wrench },
        { href: '/film/planning', label: t('film.nav.planning'), icon: CheckSquare },
        { href: '/film/locations/compare', label: t('film.nav.compare'), icon: Columns2 },
        { href: '/film/resources', label: t('film.nav.resources'), icon: GraduationCap },
        { href: '/film/profile', label: t('film.nav.profile'), icon: UserCircle2 },
        { href: '/film?change_audience=1', label: t('film.audience.switch'), icon: Clapperboard },
        { href: '/?change_mode=1', label: t('nav.changeMode'), icon: LayoutGrid },
      ] as const,
    [t],
  );

  useEffect(() => setMounted(true), []);
  useEffect(() => setMoreOpen(false), [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  const moreActive = moreLinks.some((l) =>
    l.href.startsWith('/film') ? isActive(pathname, l.href) : false,
  );

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0f0f0f]/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur md:hidden"
        aria-label={t('film.nav.primary')}
      >
        <div className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-5 items-center px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(pathname, tab.href, 'exact' in tab ? tab.exact : false);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold ${
                  active ? 'text-[#FCD116]' : 'text-white/50'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls={panelId}
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold ${
              moreOpen || moreActive ? 'text-[#FCD116]' : 'text-white/50'
            }`}
          >
            <LayoutGrid className="h-5 w-5" aria-hidden />
            {t('nav.more')}
          </button>
        </div>
      </nav>

      {mounted && moreOpen
        ? createPortal(
            <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal>
              <button
                type="button"
                className="absolute inset-0 bg-black/70"
                aria-label={t('nav.close')}
                onClick={() => setMoreOpen(false)}
              />
              <div
                id={panelId}
                className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-white/10 bg-[#141414] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{t('nav.more')}</p>
                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    className="rounded-full p-2 text-white/60"
                    aria-label={t('nav.close')}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid gap-2">
                  {moreLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/90 hover:bg-white/5"
                      >
                        <Icon className="h-5 w-5 text-[#FCD116]" aria-hidden />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
