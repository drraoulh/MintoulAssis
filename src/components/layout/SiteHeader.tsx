'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Compass,
  Hotel,
  Map,
  Menu,
  Plane,
  Users,
  X,
} from 'lucide-react';

import { AssistantMark } from '@/components/brand/AssistantMark';
import { fetchHealth } from '@/lib/api/client';
import { APP_NAME } from '@/lib/config';
import { useLocale } from '@/lib/i18n';
import type { BackendStatus } from '@/lib/types';

const LINKS = [
  { href: '/explorer', key: 'nav.explorer', icon: Compass },
  { href: '/planifier', key: 'nav.planifier', icon: Map },
  { href: '/hotels', key: 'nav.hotels', icon: Hotel },
  { href: '/mon-voyage', key: 'nav.trip', icon: Plane },
  { href: '/groupe', key: 'nav.group', icon: Users },
] as const;

export function SiteHeader() {
  const { t, locale, toggleLocale } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [status, setStatus] = useState<BackendStatus>('checking');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        await fetchHealth();
        if (!cancelled) setStatus('online');
      } catch {
        if (!cancelled) setStatus('waking');
        try {
          await fetchHealth();
          if (!cancelled) setStatus('online');
        } catch {
          if (!cancelled) setStatus('waking');
        }
      }
    };
    void probe();
    const id = setInterval(() => void probe(), 3 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const statusLabel =
    status === 'online'
      ? t('status.online')
      : status === 'checking'
        ? t('status.checking')
        : t('status.waking');

  return (
    <div className={`sticky top-0 z-50 ${scrolled ? 'shadow-md' : ''}`}>
      <div className="flex h-1.5" aria-hidden>
        <div className="flex-1 bg-[#007A5E]" />
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-[#FCD116]" />
      </div>
      <div className="bg-[#007A5E] px-3 py-1 text-center text-[11px] font-semibold text-white sm:text-xs md:text-sm">
        {t('banner.tagline')}
      </div>
      <header className="bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:h-20 sm:gap-3 sm:px-4 md:px-8">
        <Link href="/" className="flex min-w-0 items-center" aria-label={APP_NAME}>
          <Image
            src="/brand/logo.png"
            alt=""
            width={475}
            height={378}
            priority
            className="h-11 w-auto max-w-[9.5rem] object-contain sm:h-16 sm:max-w-none"
          />
        </Link>

        <nav className="ml-auto hidden items-center gap-2 lg:flex" aria-label={t('nav.primary')}>
          {LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`relative isolate rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'text-[#007A5E]' : 'text-[#373839] hover:text-[#007A5E]'
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-light"
                    className="absolute inset-0 rounded-full bg-[#FCD116]/70 shadow-[0_0_18px_5px_rgba(252,209,22,0.9)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative z-10">{t(link.key)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-6">
          <span
            className="hidden items-center gap-1.5 text-xs text-[#535557] sm:inline-flex"
            title={statusLabel}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                status === 'online' ? 'bg-[#007A5E]' : 'bg-[#FCD116]'
              }`}
              aria-hidden
            />
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={toggleLocale}
            className="rounded-full border border-gray-300 px-2.5 py-1 text-xs font-semibold text-[#535557] hover:border-[#007A5E] hover:text-[#007A5E]"
            aria-label={t('nav.lang')}
          >
            {locale.toUpperCase()}
          </button>
          <Link
            href="/assistant"
            aria-current={
              pathname === '/assistant' || pathname.startsWith('/assistant/')
                ? 'page'
                : undefined
            }
            className={`relative hidden items-center gap-2 rounded-full bg-white py-1 pl-1 pr-4 text-sm font-bold text-[#007A5E] shadow-md ring-1 ring-[#007A5E]/15 transition hover:ring-[#007A5E]/40 sm:inline-flex ${
              pathname === '/assistant' || pathname.startsWith('/assistant/')
                ? 'shadow-[0_0_18px_4px_rgba(252,209,22,0.85)]'
                : ''
            }`}
          >
            <img
              src="/brand/assistant-robot.svg"
              alt=""
              className="h-9 w-9"
            />
            {t('nav.assistantAi')}
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mint-soft)] text-[var(--green-deep)] lg:hidden"
            aria-label={open ? t('nav.menuClose') : t('nav.menuOpen')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-[var(--line)] bg-[var(--ivory)] px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-[#FCD116]/45 text-[#007A5E] shadow-[0_0_16px_rgba(252,209,22,0.65)]'
                      : 'text-[var(--ink)] hover:bg-[var(--mint-soft)]'
                  }`}
                >
                  <link.icon className="h-4 w-4 text-[var(--green)]" aria-hidden />
                  {t(link.key)}
                </Link>
              );
            })}
            <Link
              href="/assistant"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--mint-soft)]"
            >
              <AssistantMark size="sm" />
              {t('nav.assistantAi')}
            </Link>
            <Link
              href="/culture"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--mint-soft)]"
            >
              {t('nav.culture')}
            </Link>
            <Link
              href="/vision"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--mint-soft)]"
            >
              {t('nav.vision')}
            </Link>
            <Link
              href="/?reset_intro=1"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2 text-xs text-[var(--muted)]"
            >
              {t('nav.replayIntro')}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
    </div>
  );
}

export function SiteFooter() {
  const { t } = useLocale();
  return (
    <footer className="mt-auto bg-[#1a1a1a] text-white">
      <div className="flex h-1.5" aria-hidden>
        <div className="flex-1 bg-[#007A5E]" />
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-[#FCD116]" />
      </div>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4 md:px-8">
        <div>
          <Image
            src="/brand/logo.png"
            alt={APP_NAME}
            width={475}
            height={378}
            className="h-20 w-auto rounded-xl bg-white px-2 py-1"
          />
          <p className="mt-3 max-w-xs text-sm text-white/70">
            {t('footer.tagline')}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#FCD116]">
            {t('footer.discover')}
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/80">
            {[
              ['/explorer', t('footer.placesRegions')],
              ['/culture', t('nav.culture')],
              ['/hotels', t('nav.hotels')],
              ['/vision', t('nav.vision')],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-[#FCD116]">
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#FCD116]">
            {t('footer.trip')}
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/80">
            {[
              ['/planifier', t('nav.planifier')],
              ['/assistant', t('nav.assistantAi')],
              ['/mon-voyage', t('nav.trip')],
              ['/groupe', t('nav.group')],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-[#FCD116]">
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#FCD116]">
            {t('footer.hours')}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            {t('footer.hoursBody')}
          </p>
          <Link
            href="/?reset_intro=1"
            className="mt-4 inline-block text-sm text-white/70 underline-offset-4 hover:text-[#FCD116] hover:underline"
          >
            {t('footer.replayIntro')}
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/50 md:px-6">
        © 2026 {APP_NAME}. {t('footer.rights')}
      </div>
    </footer>
  );
}
