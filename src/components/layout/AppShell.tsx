'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { SiteFooter, SiteHeader } from '@/components/layout/SiteHeader';
import { ScrollToTop } from '@/components/layout/ScrollToTop';

/**
 * App chrome — hide site footer + bottom nav on /assistant (full-height chat).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [introPlaying, setIntroPlaying] = useState(false);
  const isAssistant = pathname === '/assistant' || pathname.startsWith('/assistant/');
  const isGroupRoom = /^\/groupe\/[^/]+$/.test(pathname);
  const isFullHeight = isAssistant || isGroupRoom || introPlaying;

  useEffect(() => {
    const sync = () =>
      setIntroPlaying(document.documentElement.classList.contains('intro-playing'));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  return (
    <div
      className={
        isFullHeight
          ? 'flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden'
          : 'flex min-h-[100svh] flex-col'
      }
    >
      <ScrollToTop />
      {introPlaying ? null : <SiteHeader />}
      <main
        className={
          isFullHeight
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
            : 'flex-1 pb-bottom-nav'
        }
      >
        {children}
      </main>
      {isFullHeight || introPlaying ? null : <SiteFooter />}
      {isFullHeight || introPlaying ? null : <MobileBottomNav />}
    </div>
  );
}
