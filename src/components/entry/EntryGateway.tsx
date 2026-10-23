'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
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
        // .intro-shell clips overflow; let short / landscape screens scroll instead
        overflowY: 'auto',
        background:
          'radial-gradient(ellipse 90% 55% at 20% 0%, rgba(0,122,94,0.32), transparent 55%), radial-gradient(ellipse 80% 50% at 85% 100%, rgba(206,17,38,0.24), transparent 55%), #050505',
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

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-6 sm:px-8 sm:py-10 lg:py-14">
        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#FCD116]/90 sm:text-xs">
            {APP_NAME}
          </p>
          <h1
            id="entry-gateway-title"
            className="font-display text-[1.6rem] font-bold leading-tight text-[#F8F5ED] min-[380px]:text-3xl sm:text-4xl lg:text-5xl"
          >
            {t('gateway.title')}
          </h1>
          <p className="mt-2 max-w-md text-sm text-[#F8F5ED]/70 sm:mt-3 sm:text-base">
            {t('gateway.sub')}
          </p>
        </motion.div>

        <div className="mt-6 grid w-full gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:gap-8">
          <GatewayOption
            delay={0.12}
            accent="tourism"
            logo="/brand/logo.png"
            logoSize={{ width: 475, height: 378 }}
            title={t('gateway.tourism')}
            hint={t('gateway.tourismHint')}
            cta={t('gateway.enter')}
            onClick={() => onSelect('tourism')}
          />
          <GatewayOption
            delay={0.22}
            accent="film"
            logo="/brand/logo-cinema.png"
            logoSize={{ width: 1010, height: 761 }}
            title={t('gateway.film')}
            hint={t('gateway.filmHint')}
            cta={t('gateway.enter')}
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
  logo,
  logoSize,
  title,
  hint,
  cta,
  onClick,
}: {
  delay: number;
  accent: 'tourism' | 'film';
  logo: string;
  logoSize: { width: number; height: number };
  title: string;
  hint: string;
  cta: string;
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
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      className={`group relative flex items-center gap-4 overflow-hidden rounded-3xl border px-4 py-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#FCD116] sm:flex-col sm:items-center sm:gap-5 sm:px-7 sm:py-8 sm:text-center lg:py-10 ${
        isTourism
          ? 'border-[#007A5E]/50 bg-[#007A5E]/[0.12] hover:border-[#00a37d] hover:bg-[#007A5E]/[0.2]'
          : 'border-[#CE1126]/45 bg-[#CE1126]/[0.1] hover:border-[#FCD116] hover:bg-[#CE1126]/[0.16]'
      }`}
    >
      {/* Soft halo behind the logo */}
      <span
        aria-hidden
        className={`pointer-events-none absolute left-10 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:left-1/2 sm:top-24 sm:h-56 sm:w-56 ${
          isTourism ? 'bg-[#007A5E]/35' : 'bg-[#CE1126]/30'
        }`}
      />
      <span className="relative flex h-20 w-24 shrink-0 items-center justify-center min-[400px]:h-24 min-[400px]:w-28 sm:h-36 sm:w-auto lg:h-44">
        <Image
          src={logo}
          alt=""
          width={logoSize.width}
          height={logoSize.height}
          priority
          sizes="(min-width: 1024px) 240px, (min-width: 640px) 200px, 112px"
          className="h-full w-auto object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)] transition duration-500 group-hover:scale-[1.04]"
        />
      </span>
      <span className="relative min-w-0 flex-1 sm:flex-none">
        <span className="font-display block text-base font-bold leading-snug text-[#F8F5ED] min-[400px]:text-lg sm:text-2xl">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-[#F8F5ED]/65 min-[400px]:text-sm sm:mt-2">
          {hint}
        </span>
        <span
          className={`mt-3 hidden items-center gap-2 rounded-full px-5 py-2 text-sm font-bold sm:inline-flex ${
            isTourism ? 'bg-[#007A5E] text-white' : 'bg-[#CE1126] text-white'
          }`}
        >
          {cta}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
      <ArrowRight
        className="relative h-5 w-5 shrink-0 text-[#FCD116] transition group-hover:translate-x-0.5 sm:hidden"
        aria-hidden
      />
    </motion.button>
  );
}
