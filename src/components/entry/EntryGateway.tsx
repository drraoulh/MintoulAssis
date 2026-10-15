'use client';

import { motion } from 'framer-motion';
import { Clapperboard, Compass } from 'lucide-react';
import Image from 'next/image';

import { APP_NAME } from '@/lib/config';
import { useLocale } from '@/lib/i18n';
import type { EntryMode } from '@/lib/entry-mode';

const EASE = [0.22, 1, 0.36, 1] as const;

type Props = {
  onSelect: (mode: EntryMode) => void;
};

export function EntryGateway({ onSelect }: Props) {
  const { t } = useLocale();

  return (
    <div
      className="intro-shell"
      style={{
        background:
          'radial-gradient(ellipse 90% 55% at 50% 0%, rgba(0,122,94,0.3), transparent 55%), radial-gradient(ellipse 70% 40% at 80% 100%, rgba(206,17,38,0.18), transparent 50%), #050505',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-gateway-title"
    >
      <div className="flex h-1.5 w-full shrink-0" aria-hidden>
        <div className="flex-1 bg-[#007A5E]" />
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-[#FCD116]" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-8 sm:py-10">
        <motion.div
          className="mx-auto flex w-full max-w-3xl shrink-0 flex-col items-center text-center"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <Image
            src="/brand/logo.png"
            alt={APP_NAME}
            width={475}
            height={378}
            priority
            className="mb-4 h-14 w-auto object-contain sm:mb-5 sm:h-20"
          />
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#FCD116]/90 sm:text-[0.7rem]">
            {APP_NAME}
          </p>
          <h1
            id="entry-gateway-title"
            className="font-display text-[1.55rem] font-bold leading-tight text-[#F8F5ED] sm:text-4xl"
          >
            {t('gateway.title')}
          </h1>
          <p className="mt-2 max-w-md text-sm text-[#F8F5ED]/70 sm:mt-3 sm:text-base">
            {t('gateway.sub')}
          </p>
        </motion.div>

        {/* Mobile: full-height stacked chooser; desktop: side by side */}
        <div className="mx-auto mt-6 flex w-full max-w-3xl min-h-0 flex-1 flex-col gap-3 sm:mt-10 sm:grid sm:flex-none sm:grid-cols-2 sm:gap-5">
          <GatewayOption
            delay={0.12}
            accent="tourism"
            icon={Compass}
            title={t('gateway.tourism')}
            hint={t('gateway.tourismHint')}
            onClick={() => onSelect('tourism')}
          />
          <GatewayOption
            delay={0.22}
            accent="film"
            icon={Clapperboard}
            title={t('gateway.film')}
            hint={t('gateway.filmHint')}
            onClick={() => onSelect('film')}
          />
        </div>
      </div>
    </div>
  );
}

function GatewayOption({
  delay,
  accent,
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  delay: number;
  accent: 'tourism' | 'film';
  icon: typeof Compass;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  const isTourism = accent === 'tourism';
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      className={
        isTourism
          ? 'group flex min-h-0 flex-1 flex-col items-start justify-center gap-3 rounded-2xl border border-[#007A5E]/45 bg-[#007A5E]/14 px-5 py-6 text-left outline-none transition hover:border-[#007A5E] hover:bg-[#007A5E]/22 focus-visible:ring-2 focus-visible:ring-[#FCD116] sm:min-h-[13rem] sm:flex-none sm:justify-start sm:gap-4 sm:px-6 sm:py-7'
          : 'group flex min-h-0 flex-1 flex-col items-start justify-center gap-3 rounded-2xl border border-[#FCD116]/35 bg-[#CE1126]/12 px-5 py-6 text-left outline-none transition hover:border-[#FCD116] hover:bg-[#CE1126]/18 focus-visible:ring-2 focus-visible:ring-[#FCD116] sm:min-h-[13rem] sm:flex-none sm:justify-start sm:gap-4 sm:px-6 sm:py-7'
      }
    >
      <span
        className={
          isTourism
            ? 'flex h-11 w-11 items-center justify-center rounded-full bg-[#007A5E] text-white shadow-[0_0_24px_rgba(0,122,94,0.45)] sm:h-12 sm:w-12'
            : 'flex h-11 w-11 items-center justify-center rounded-full bg-[#CE1126] text-white shadow-[0_0_24px_rgba(206,17,38,0.4)] sm:h-12 sm:w-12'
        }
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
      </span>
      <span className="block">
        <span className="font-display block text-lg font-bold text-[#F8F5ED] sm:text-2xl">
          {title}
        </span>
        <span className="mt-1.5 block text-sm leading-relaxed text-[#F8F5ED]/65 sm:mt-2">
          {hint}
        </span>
      </span>
      <span className="mt-auto text-xs font-semibold uppercase tracking-[0.16em] text-[#FCD116] opacity-80 group-hover:opacity-100">
        {isTourism ? '→' : '→'}
      </span>
    </motion.button>
  );
}
