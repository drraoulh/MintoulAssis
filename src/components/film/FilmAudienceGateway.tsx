'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';

import type { FilmAudience } from '@/lib/film/audience';
import { useLocale } from '@/lib/i18n';

const EASE = [0.22, 1, 0.36, 1] as const;

type Props = {
  onSelect: (audience: FilmAudience) => void;
};

export function FilmAudienceGateway({ onSelect }: Props) {
  const { t, locale, setLocale } = useLocale();

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-black"
      role="dialog"
      aria-modal="true"
      aria-labelledby="film-audience-title"
    >
      <Image
        src="/film/hub/directory.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="pointer-events-none object-cover opacity-25 grayscale-[40%]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(0,0,0,0.35), rgba(0,0,0,0.92) 75%), linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.85))',
        }}
      />

      <div className="relative flex h-[2px] w-full shrink-0" aria-hidden>
        <div className="flex-1 bg-[#079941]" />
        <div className="flex-1 bg-[#E30D13]" />
        <div className="flex-1 bg-[#F5E80C]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-5 py-10 sm:px-8 sm:py-14">
        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <Image
            src="/brand/logo-cinema.png"
            alt="SmartMboa Cinéma"
            width={1010}
            height={761}
            priority
            sizes="220px"
            className="h-24 w-auto object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.8)] sm:h-32"
          />
          <p className="cine-kicker mt-6">{locale === 'fr' ? 'Prise 1' : 'Take 1'}</p>
          <h1
            id="film-audience-title"
            className="font-display mt-4 text-5xl text-[#F8F5ED] sm:text-7xl"
          >
            {t('film.audience.title')}
          </h1>
          <p className="font-cine-serif mt-4 max-w-lg text-lg italic text-[#F8F5ED]/70 sm:text-xl">
            {t('film.audience.sub')}
          </p>

          <div className="mt-6 flex items-center border border-white/20 text-[10px] font-bold uppercase tracking-[0.24em]">
            {(['en', 'fr'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={`px-4 py-2 transition ${
                  locale === l ? 'bg-[#F5E80C] text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                {l === 'en' ? 'English' : 'Français'}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="mt-10 grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:mt-12 sm:grid-cols-2">
          <AudienceCard
            delay={0.15}
            index="01"
            title={t('film.audience.intl')}
            tagline={t('film.audience.intlTag')}
            hint={t('film.audience.intlHint')}
            onClick={() => onSelect('international')}
          />
          <AudienceCard
            delay={0.25}
            index="02"
            title={t('film.audience.local')}
            tagline={t('film.audience.localTag')}
            hint={t('film.audience.localHint')}
            onClick={() => onSelect('local')}
          />
        </div>
      </div>
    </div>
  );
}

function AudienceCard({
  delay,
  index,
  title,
  tagline,
  hint,
  onClick,
}: {
  delay: number;
  index: string;
  title: string;
  tagline: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className="group relative flex flex-col items-start gap-3 bg-black/80 px-6 py-7 text-left outline-none backdrop-blur-sm transition hover:bg-[#0f0d08] focus-visible:ring-2 focus-visible:ring-[#F5E80C] sm:min-h-[15rem] sm:px-8 sm:py-9"
    >
      <span className="font-display text-3xl text-[#F5E80C]">{index}</span>
      <span className="block h-px w-10 bg-[#F5E80C] transition-all duration-500 group-hover:w-24" />
      <span className="font-display block text-3xl text-[#F8F5ED] sm:text-4xl">{title}</span>
      <span className="font-cine-serif block text-lg italic text-[#F5E80C]/90">{tagline}</span>
      <span className="block text-sm leading-relaxed text-[#F8F5ED]/60">{hint}</span>
      <span className="mt-auto inline-flex items-center gap-2 pt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/70 transition group-hover:text-[#F5E80C]">
        Action
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" aria-hidden />
      </span>
    </motion.button>
  );
}
