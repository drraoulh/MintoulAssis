'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clapperboard, Compass } from 'lucide-react';

import { setEntryMode, type EntryMode } from '@/lib/entry-mode';
import { useLocale } from '@/lib/i18n';

type Props = {
  /** Visual density for header vs mobile bar */
  size?: 'sm' | 'md';
  className?: string;
};

export function SectionSwitcher({ size = 'sm', className = '' }: Props) {
  const { t } = useLocale();
  const pathname = usePathname();
  const active: EntryMode = pathname.startsWith('/film') ? 'film' : 'tourism';

  const pad = size === 'md' ? 'px-3 py-2 text-xs sm:text-sm' : 'px-2.5 py-1.5 text-[11px] sm:text-xs';

  return (
    <div
      className={`inline-flex items-center rounded-full border border-black/10 bg-black/5 p-0.5 ${className}`}
      role="group"
      aria-label={t('nav.sectionSwitch')}
    >
      <Link
        href="/"
        onClick={() => setEntryMode('tourism')}
        className={`${pad} inline-flex items-center gap-1.5 rounded-full font-semibold transition ${
          active === 'tourism'
            ? 'bg-[var(--green-deep)] text-white shadow-sm'
            : 'text-[var(--muted)] hover:text-[var(--ink)]'
        }`}
        aria-current={active === 'tourism' ? 'page' : undefined}
      >
        <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">{t('nav.sectionTourism')}</span>
      </Link>
      <Link
        href="/film"
        onClick={() => setEntryMode('film')}
        className={`${pad} inline-flex items-center gap-1.5 rounded-full font-semibold transition ${
          active === 'film'
            ? 'bg-[#CE1126] text-white shadow-sm'
            : 'text-[var(--muted)] hover:text-[var(--ink)]'
        }`}
        aria-current={active === 'film' ? 'page' : undefined}
      >
        <Clapperboard className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">{t('nav.sectionFilm')}</span>
      </Link>
    </div>
  );
}

/** Dark variant for film chrome */
export function FilmSectionSwitcher({ size = 'sm', className = '' }: Props) {
  const { t } = useLocale();
  const pathname = usePathname();
  const active: EntryMode = pathname.startsWith('/film') ? 'film' : 'tourism';
  const pad = size === 'md' ? 'px-3 py-2 text-xs sm:text-sm' : 'px-2.5 py-1.5 text-[11px] sm:text-xs';

  return (
    <div
      className={`inline-flex items-center rounded-full border border-white/15 bg-white/5 p-0.5 ${className}`}
      role="group"
      aria-label={t('nav.sectionSwitch')}
    >
      <Link
        href="/"
        onClick={() => setEntryMode('tourism')}
        className={`${pad} inline-flex items-center gap-1.5 rounded-full font-semibold transition ${
          active === 'tourism'
            ? 'bg-[#007A5E] text-white'
            : 'text-white/55 hover:text-white'
        }`}
      >
        <Compass className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">{t('nav.sectionTourism')}</span>
      </Link>
      <Link
        href="/film"
        onClick={() => setEntryMode('film')}
        className={`${pad} inline-flex items-center gap-1.5 rounded-full font-semibold transition ${
          active === 'film'
            ? 'bg-[#CE1126] text-white'
            : 'text-white/55 hover:text-white'
        }`}
      >
        <Clapperboard className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">{t('nav.sectionFilm')}</span>
      </Link>
    </div>
  );
}
