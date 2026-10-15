'use client';

import { motion } from 'framer-motion';
import { Globe2, Home } from 'lucide-react';
import Image from 'next/image';

import { APP_NAME } from '@/lib/config';
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
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(206,17,38,0.28), transparent 50%), #050505',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="film-audience-title"
    >
      <div className="flex h-1.5 w-full shrink-0" aria-hidden>
        <div className="flex-1 bg-[#007A5E]" />
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-[#FCD116]" />
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12">
        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Image
            src="/brand/logo.png"
            alt={APP_NAME}
            width={475}
            height={378}
            className="mb-4 h-14 w-auto object-contain sm:h-16"
          />
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#FCD116]/90">
            {APP_NAME} · {t('nav.sectionFilm')}
          </p>
          <h1
            id="film-audience-title"
            className="font-display text-[1.55rem] font-bold leading-tight text-[#F8F5ED] sm:text-4xl"
          >
            {t('film.audience.title')}
          </h1>
          <p className="mt-3 max-w-lg text-sm text-[#F8F5ED]/70 sm:text-base">
            {t('film.audience.sub')}
          </p>

          <div className="mt-5 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                locale === 'en' ? 'bg-white text-black' : 'text-white/60'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLocale('fr')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                locale === 'fr' ? 'bg-white text-black' : 'text-white/60'
              }`}
            >
              Français
            </button>
          </div>
        </motion.div>

        <div className="mt-8 flex min-h-0 flex-1 flex-col gap-3 sm:mt-10 sm:grid sm:flex-none sm:grid-cols-2 sm:gap-5">
          <AudienceCard
            delay={0.12}
            icon={Globe2}
            accent="intl"
            title={t('film.audience.intl')}
            tagline={t('film.audience.intlTag')}
            hint={t('film.audience.intlHint')}
            onClick={() => onSelect('international')}
          />
          <AudienceCard
            delay={0.22}
            icon={Home}
            accent="local"
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
  icon: Icon,
  accent,
  title,
  tagline,
  hint,
  onClick,
}: {
  delay: number;
  icon: typeof Globe2;
  accent: 'intl' | 'local';
  title: string;
  tagline: string;
  hint: string;
  onClick: () => void;
}) {
  const isIntl = accent === 'intl';
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      className={
        isIntl
          ? 'group flex min-h-0 flex-1 flex-col items-start gap-3 rounded-2xl border border-[#FCD116]/35 bg-[#FCD116]/08 px-5 py-6 text-left outline-none hover:border-[#FCD116] focus-visible:ring-2 focus-visible:ring-[#FCD116] sm:min-h-[14rem] sm:flex-none'
          : 'group flex min-h-0 flex-1 flex-col items-start gap-3 rounded-2xl border border-[#007A5E]/45 bg-[#007A5E]/12 px-5 py-6 text-left outline-none hover:border-[#007A5E] focus-visible:ring-2 focus-visible:ring-[#FCD116] sm:min-h-[14rem] sm:flex-none'
      }
    >
      <span
        className={
          isIntl
            ? 'flex h-11 w-11 items-center justify-center rounded-full bg-[#CE1126] text-white'
            : 'flex h-11 w-11 items-center justify-center rounded-full bg-[#007A5E] text-white'
        }
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="block">
        <span className="font-display block text-lg font-bold text-[#F8F5ED] sm:text-xl">
          {title}
        </span>
        <span className="mt-1 block text-sm font-semibold text-[#FCD116]">{tagline}</span>
        <span className="mt-2 block text-sm leading-relaxed text-[#F8F5ED]/65">{hint}</span>
      </span>
      <span className="mt-auto text-xs font-semibold uppercase tracking-[0.16em] text-[#FCD116]/80">
        →
      </span>
    </motion.button>
  );
}
