'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Compass,
  Heart,
  Home,
  Hotel,
  Landmark,
  LayoutGrid,
  Map,
  Plane,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

import { useLocale } from '@/lib/i18n';

function isActivePath(pathname: string, href: string, exact?: boolean) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();

  const tabs = useMemo(
    () =>
      [
        { href: '/', label: t('nav.home'), icon: Home, exact: true as const },
        { href: '/explorer', label: t('nav.explorer'), icon: Compass },
        { href: '/assistant', label: 'AI', icon: Sparkles, center: true as const },
        { href: '/mon-voyage', label: t('nav.tripShort'), icon: Plane },
      ] as const,
    [t],
  );

  const moreLinks = useMemo(
    () =>
      [
        { href: '/wishlist', label: t('nav.wishlist'), icon: Heart },
        { href: '/culture', label: t('nav.culture'), icon: Landmark },
        { href: '/vision', label: t('nav.vision'), icon: Camera },
        { href: '/hotels', label: t('nav.hotels'), icon: Hotel },
        { href: '/planifier', label: t('nav.planifier'), icon: Map },
        { href: '/groupe', label: t('nav.group'), icon: Users },
        { href: '/destinations', label: t('nav.destinations'), icon: Compass },
      ] as const,
    [t],
  );

  const moreActive = moreLinks.some((link) => isActivePath(pathname, link.href));

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const sheet =
    mounted && open
      ? createPortal(
          <div className="lg:hidden">
            <button
              type="button"
              className="fixed inset-0 z-[60] bg-black/40"
              aria-label={t('nav.close')}
              onClick={() => setOpen(false)}
            />
            <div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label={t('nav.more')}
              className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl border-t border-[var(--line)] bg-[var(--ivory)] px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-lift)]"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--line)]" aria-hidden />
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-display text-lg font-semibold text-[var(--green-deep)]">
                    {t('nav.more')}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{t('nav.moreHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--mint-soft)] text-[var(--green-deep)]"
                  aria-label={t('nav.close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="grid grid-cols-2 gap-2">
                {moreLinks.map((link) => {
                  const active = isActivePath(pathname, link.href);
                  const Icon = link.icon;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                          active
                            ? 'border-[var(--gold)] bg-[#FCD116]/35 text-[var(--green-deep)]'
                            : 'border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--green)]'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[var(--green)]" aria-hidden />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--ivory)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label={t('nav.mobile')}
      >
        <ul className="mx-auto flex h-[4.5rem] max-w-lg items-end justify-around px-2">
          {tabs.map((item) => {
            const active = isActivePath(pathname, item.href, 'exact' in item ? item.exact : false);
            const Icon = item.icon;
            if ('center' in item && item.center) {
              return (
                <li key={item.href} className="-mt-5">
                  <Link
                    href={item.href}
                    className="flex flex-col items-center gap-1"
                    aria-label={t('nav.assistantAi')}
                  >
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg ring-4 ring-[var(--ivory)] transition ${
                        active
                          ? 'bg-[var(--gold)] text-[var(--green-deep)]'
                          : 'bg-[var(--green-deep)] text-white'
                      }`}
                    >
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--green-deep)]">
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex max-w-[4.75rem] flex-col items-center gap-1 px-1 py-2 text-center text-[10px] font-medium leading-tight ${
                    active ? 'text-[var(--green-deep)]' : 'text-[var(--muted)]'
                  }`}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 ${active ? 'text-[var(--gold)]' : ''}`}
                    aria-hidden
                  />
                  <span className="line-clamp-2 w-full">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={`flex flex-col items-center gap-1 px-2 py-2 text-[10px] font-medium ${
                open || moreActive ? 'text-[var(--green-deep)]' : 'text-[var(--muted)]'
              }`}
              aria-expanded={open}
              aria-controls={panelId}
              aria-haspopup="dialog"
              aria-label={open ? t('nav.moreClose') : t('nav.moreOpen')}
            >
              {open ? (
                <X
                  className={`h-5 w-5 ${open || moreActive ? 'text-[var(--gold)]' : ''}`}
                  aria-hidden
                />
              ) : (
                <LayoutGrid
                  className={`h-5 w-5 ${moreActive ? 'text-[var(--gold)]' : ''}`}
                  aria-hidden
                />
              )}
              {t('nav.more')}
            </button>
          </li>
        </ul>
      </nav>
      {sheet}
    </>
  );
}
