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
          'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(0,122,94,0.28), transparent 55%), #050505',
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

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-8 sm:px-8">
        <motion.div
          className="flex w-full max-w-3xl flex-col items-center text-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <Image
            src="/brand/logo.png"
            alt={APP_NAME}
            width={475}
            height={378}
            priority
            className="mb-5 h-16 w-auto object-contain sm:h-20"
          />
          <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[#FCD116]/90">
            {APP_NAME}
          </p>
          <h1
            id="entry-gateway-title"
            className="font-display text-[1.65rem] font-bold leading-tight text-[#F8F5ED] sm:text-4xl"
          >
            {t('gateway.title')}
          </h1>
          <p className="mt-3 max-w-md text-sm text-[#F8F5ED]/70 sm:text-base">
            {t('gateway.sub')}
          </p>
        </motion.div>

        <div className="mt-10 grid w-full max-w-3xl gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5">
          <GatewayOption
            delay={0.15}
            accent="tourism"
            icon={Compass}
            title={t('gateway.tourism')}
            hint={t('gateway.tourismHint')}
            onClick={() => onSelect('tourism')}
          />
          <GatewayOption
            delay={0.28}
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
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay, ease: EASE }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      className={
        isTourism
          ? 'group flex min-h-[11.5rem] flex-col items-start gap-4 rounded-2xl border border-[#007A5E]/45 bg-[#007A5E]/12 px-6 py-7 text-left outline-none transition hover:border-[#007A5E] hover:bg-[#007A5E]/20 focus-visible:ring-2 focus-visible:ring-[#FCD116] sm:min-h-[13rem]'
          : 'group flex min-h-[11.5rem] flex-col items-start gap-4 rounded-2xl border border-[#FCD116]/35 bg-[#FCD116]/08 px-6 py-7 text-left outline-none transition hover:border-[#FCD116] hover:bg-[#FCD116]/14 focus-visible:ring-2 focus-visible:ring-[#FCD116] sm:min-h-[13rem]'
      }
    >
      <span
        className={
          isTourism
            ? 'flex h-12 w-12 items-center justify-center rounded-full bg-[#007A5E] text-white shadow-[0_0_24px_rgba(0,122,94,0.45)]'
            : 'flex h-12 w-12 items-center justify-center rounded-full bg-[#CE1126] text-white shadow-[0_0_24px_rgba(206,17,38,0.4)]'
        }
      >
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <span className="block">
        <span className="font-display block text-xl font-bold text-[#F8F5ED] sm:text-2xl">
          {title}
        </span>
        <span className="mt-2 block text-sm leading-relaxed text-[#F8F5ED]/65">{hint}</span>
      </span>
      <span
        className={
          isTourism
            ? 'mt-auto text-xs font-semibold uppercase tracking-[0.16em] text-[#FCD116] opacity-80 group-hover:opacity-100'
            : 'mt-auto text-xs font-semibold uppercase tracking-[0.16em] text-[#FCD116] opacity-80 group-hover:opacity-100'
        }
      >
        →
      </span>
    </motion.button>
  );
}
