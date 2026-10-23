'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { FilmShell } from '@/components/film/FilmShell';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { SiteFooter, SiteHeader } from '@/components/layout/SiteHeader';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { markHydrated } from '@/lib/hydration';

/**
 * App chrome — tourism shell by default; film world gets its own menus.
 * Hide chrome entirely during the cinematic intro / gateway.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [introPlaying, setIntroPlaying] = useState(false);
  const isAssistant = pathname === '/assistant' || pathname.startsWith('/assistant/');
  const isGroupRoom = /^\/groupe\/[^/]+$/.test(pathname);
  const isFilmWorld = pathname === '/film' || pathname.startsWith('/film/');
  const isFullHeight = isAssistant || isGroupRoom || introPlaying;

  useEffect(() => {
    markHydrated();
    const sync = () =>
      setIntroPlaying(document.documentElement.classList.contains('intro-playing'));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  if (introPlaying) {
    return (
      <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden">
        <ScrollToTop />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    );
  }

  if (isFilmWorld) {
    return (
      <>
        <ScrollToTop />
        <FilmShell>{children}</FilmShell>
      </>
    );
  }

  return (
    <div
      className={
        isFullHeight
          ? 'flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden'
          : 'flex min-h-[100svh] flex-col'
      }
    >
      <ScrollToTop />
      <SiteHeader />
      <main
        className={
          isFullHeight
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
            : 'flex-1 pb-bottom-nav'
        }
      >
        {children}
      </main>
      {isFullHeight ? null : <SiteFooter />}
      {isFullHeight ? null : <MobileBottomNav />}
    </div>
  );
}
