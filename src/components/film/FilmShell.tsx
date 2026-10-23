'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  CalendarDays,
  CarFront,
  CheckSquare,
  Clapperboard,
  ClipboardList,
  Columns2,
  GraduationCap,
  Home,
  LayoutGrid,
  MapPin,
  Menu,
  Theater,
  UserCircle2,
  Users,
  Wrench,
  X,
} from 'lucide-react';

import { FilmSectionSwitcher } from '@/components/entry/SectionSwitcher';
import { FilmFloatingAssistant } from '@/components/film/FilmFloatingAssistant';
import { FooterSignature } from '@/components/layout/FooterSignature';
import { useLocale } from '@/lib/i18n';

const FILM_LINKS = [
  { href: '/film', key: 'film.nav.home', icon: Home, exact: true },
  { href: '/film/locations', key: 'film.nav.locations', icon: MapPin },
  { href: '/film/halls', key: 'film.nav.halls', icon: Theater },
  { href: '/film/events', key: 'film.nav.events', icon: CalendarDays },
  { href: '/film/procedures', key: 'film.nav.procedures', icon: ClipboardList },
  { href: '/film/directory', key: 'film.nav.directory', icon: Users },
  { href: '/film/equipment', key: 'film.nav.equipment', icon: Wrench },
  { href: '/film/rentals', key: 'film.nav.rentals', icon: CarFront },
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
      className={`film-theme flex text-[#F8F5ED] ${
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
            : 'flex-1'
        }
      >
        {children}
      </main>
      {isAssistant ? null : <FilmFooter />}
      <FilmBottomNav />
      <FilmFloatingAssistant />
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
      <div className="flex h-[2px]" aria-hidden>
        <div className="flex-1 bg-[#079941]" />
        <div className="flex-1 bg-[#E30D13]" />
        <div className="flex-1 bg-[#F5E80C]" />
      </div>
      <div className="hidden border-b border-white/[0.06] bg-black py-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.42em] text-[#F5E80C]/80 sm:block">
        {t('film.banner')}
      </div>
      <header className="border-b border-white/[0.08] bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:h-[4.25rem] sm:gap-3 sm:px-4 md:px-8">
          <Link href="/film" className="flex min-w-0 items-center gap-2" aria-label="SmartMboa Cinéma">
            <Image
              src="/brand/logo-cinema.png"
              alt=""
              width={1010}
              height={761}
              priority
              sizes="80px"
              className="h-10 w-auto object-contain sm:h-12"
            />
          </Link>

          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <nav className="mr-2 flex items-center gap-6" aria-label={t('film.nav.primary')}>
              {FILM_LINKS.filter((l) =>
                [
                  '/film',
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
                    className={`relative py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:bg-[#F5E80C] after:transition-transform ${
                      active
                        ? 'text-[#F5E80C] after:scale-x-100'
                        : 'text-white/60 after:scale-x-0 hover:text-white hover:after:scale-x-100'
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
              className="border border-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/75 hover:border-[#F5E80C] hover:text-[#F5E80C]"
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
              className="border border-white/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/75"
            >
              {locale === 'fr' ? 'EN' : 'FR'}
            </button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center border border-white/20 text-white"
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
                    className={`flex items-center gap-3 border-l-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] ${
                      active
                        ? 'border-[#F5E80C] bg-white/[0.04] text-[#F5E80C]'
                        : 'border-transparent text-white/75 hover:bg-white/[0.03]'
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

function FilmFooter() {
  const { t } = useLocale();
  const links = [
    ['/film/locations', t('film.nav.locations')],
    ['/film/halls', t('film.nav.halls')],
    ['/film/events', t('film.nav.events')],
    ['/?change_mode=1', t('nav.changeMode')],
  ] as const;

  return (
    // Bottom padding keeps the footer clear of the fixed mobile tab bar
    <footer className="border-t border-white/[0.08] bg-black pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-8 text-center md:flex-row md:justify-between md:px-8 md:text-left">
        <div className="flex flex-col items-center gap-3 md:flex-row md:gap-4">
          <Image
            src="/brand/logo-cinema.png"
            alt="SmartMboa Cinéma"
            width={1010}
            height={761}
            sizes="72px"
            className="h-12 w-auto object-contain"
          />
          <p className="font-cine-serif max-w-xs text-base italic text-white/60">{t('film.home.heroCaption')}</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-[#F5E80C]">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <FooterSignature brand="SmartMboa Cinéma" accent="#F5E80C" />
    </footer>
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
        { href: '/film/rentals', label: t('film.nav.rentals'), icon: CarFront },
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
        <div className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-4 items-center px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(pathname, tab.href, 'exact' in tab ? tab.exact : false);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] font-semibold ${
                  active ? 'text-[#F5E80C]' : 'text-white/50'
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
              moreOpen || moreActive ? 'text-[#F5E80C]' : 'text-white/50'
            }`}
          >
            <LayoutGrid className="h-5 w-5" aria-hidden />
            {t('nav.more')}
          </button>
        </div>
      </nav>

      {mounted && moreOpen
        ? createPortal(
            <div className="fixed inset-0 z-[10000] md:hidden" role="dialog" aria-modal>
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
                        <Icon className="h-5 w-5 text-[#F5E80C]" aria-hidden />
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
