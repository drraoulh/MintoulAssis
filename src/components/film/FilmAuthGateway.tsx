'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

import { ProducerAuthForm } from '@/components/film/ProducerAuthForm';
import type { FilmAudience } from '@/lib/film/audience';
import { useLocale } from '@/lib/i18n';

const EASE = [0.22, 1, 0.36, 1] as const;

type Props = {
  audience: FilmAudience;
  onSubmitted: () => void;
  onBack: () => void;
};

export function FilmAuthGateway({ audience, onSubmitted, onBack }: Props) {
  const { t, locale } = useLocale();
  const isLocal = audience === 'local';
  const roleLabel = isLocal ? t('film.audience.local') : t('film.audience.intl');
  const roleHint = isLocal
    ? t('film.auth.gateway.localHint')
    : t('film.auth.gateway.intlHint');

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-black"
      role="dialog"
      aria-modal="true"
      aria-labelledby="film-auth-title"
    >
      <Image
        src="/film/hub/procedures.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="pointer-events-none object-cover opacity-20 grayscale-[35%]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 20%, rgba(0,0,0,0.25), rgba(0,0,0,0.94) 72%), linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.92))',
        }}
      />

      <div className="relative flex h-[2px] w-full shrink-0" aria-hidden>
        <div className="flex-1 bg-[#079941]" />
        <div className="flex-1 bg-[#E30D13]" />
        <div className="flex-1 bg-[#F5E80C]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-8 sm:px-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <button
            type="button"
            onClick={onBack}
            className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/55 transition hover:text-[#F5E80C]"
          >
            ← {t('film.auth.gateway.back')}
          </button>

          <p className="cine-kicker mt-6">{locale === 'fr' ? 'Prise 2' : 'Take 2'}</p>
          <h1
            id="film-auth-title"
            className="font-display mt-3 text-4xl text-[#F8F5ED] sm:text-5xl"
          >
            {t('film.auth.gateway.title')}
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#F5E80C]">{roleLabel}</p>
          <p className="font-cine-serif mt-3 max-w-xl text-base italic text-[#F8F5ED]/70 sm:text-lg">
            {roleHint}
          </p>
        </motion.div>

        <motion.div
          className="mt-8 rounded-2xl border border-white/10 bg-black/75 p-5 backdrop-blur-sm sm:p-7"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.12, ease: EASE }}
        >
          <ProducerAuthForm compact onSubmitted={onSubmitted} />
        </motion.div>
      </div>
    </div>
  );
}
