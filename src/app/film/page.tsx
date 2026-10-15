'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Clapperboard } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { APP_NAME } from '@/lib/config';
import { clearEntryMode, getEntryMode, setEntryMode } from '@/lib/entry-mode';
import { useLocale } from '@/lib/i18n';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function FilmProductionPage() {
  const { t } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (getEntryMode() !== 'film') setEntryMode('film');
    document.documentElement.classList.remove('intro-playing');
  }, []);

  const backToGateway = useCallback(() => {
    clearEntryMode();
    router.push('/?change_mode=1');
  }, [router]);

  return (
    <div
      className="relative min-h-[100svh] overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(206,17,38,0.35), transparent 50%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(252,209,22,0.12), transparent 45%), #0a0a0a',
      }}
    >
      <div className="flex h-1.5 w-full" aria-hidden>
        <div className="flex-1 bg-[#007A5E]" />
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-[#FCD116]" />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center px-5 py-14 text-center sm:px-8 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE }}
          className="flex flex-col items-center"
        >
          <Image
            src="/brand/logo.png"
            alt={APP_NAME}
            width={475}
            height={378}
            className="mb-6 h-14 w-auto object-contain sm:h-16"
          />
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#CE1126] text-white shadow-[0_0_32px_rgba(206,17,38,0.45)]">
            <Clapperboard className="h-7 w-7" aria-hidden />
          </span>
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[#FCD116]/90">
            {APP_NAME}
          </p>
          <h1 className="font-display text-3xl font-bold text-[#F8F5ED] sm:text-5xl">
            {t('film.title')}
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[#F8F5ED]/72 sm:text-lg">
            {t('film.body')}
          </p>
          <p className="mt-3 text-sm text-[#FCD116]/85">{t('film.soon')}</p>
        </motion.div>

        <motion.div
          className="mt-12 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <button
            type="button"
            onClick={backToGateway}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#F8F5ED]/25 px-6 py-3 text-sm font-semibold text-[#F8F5ED] hover:border-[#FCD116] hover:text-[#FCD116]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t('film.backGateway')}
          </button>
          <Link
            href="/"
            onClick={() => setEntryMode('tourism')}
            className="inline-flex items-center justify-center rounded-full bg-[#007A5E] px-6 py-3 text-sm font-semibold text-white hover:bg-[#00614b]"
          >
            {t('film.gotoTourism')}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
