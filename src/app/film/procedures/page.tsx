'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { FILM_AUTHORITIES, FILM_GUIDE_CARDS } from '@/lib/film/procedures';
import type { FilmGuideBlock } from '@/lib/film/types';
import { useLocale } from '@/lib/i18n';

function GuideBlock({ block, fr }: { block: FilmGuideBlock; fr: boolean }) {
  const title = fr ? block.titleFr : block.titleEn;
  const paragraphs = fr ? block.paragraphsFr : block.paragraphsEn;
  const bullets = fr ? block.bulletsFr : block.bulletsEn;

  return (
    <div className="space-y-3">
      {title ? (
        <h3 className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#F5E80C]">
          {title}
        </h3>
      ) : null}
      {paragraphs?.map((p, i) => (
        <p key={i} className="text-sm leading-relaxed text-white/70">
          {p}
        </p>
      ))}
      {bullets?.length ? (
        <ul className="space-y-2.5">
          {bullets.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-white/75">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E30D13]" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function FilmProceduresPage() {
  const { t, locale } = useLocale();
  const fr = locale === 'fr';
  const cards = [...FILM_GUIDE_CARDS].sort((a, b) => a.order - b.order);
  const [openId, setOpenId] = useState<string | null>(cards[0]?.id ?? null);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="max-w-2xl">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#F5E80C]">
          {t('film.nav.procedures')}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">
          {t('film.procedures.title')}
        </h1>
        <p className="mt-3 text-sm text-white/60 sm:text-base">{t('film.procedures.sub')}</p>
        <p className="mt-2 text-xs text-white/40">{t('film.procedures.source')}</p>
      </header>

      <div className="mt-10 space-y-3" role="list">
        {cards.map((card) => {
          const kicker = fr ? card.kickerFr : card.kickerEn;
          const headline = fr ? card.headlineFr : card.headlineEn;
          const open = openId === card.id;
          const panelId = `guide-panel-${card.id}`;
          const btnId = `guide-btn-${card.id}`;

          return (
            <div
              key={card.id}
              role="listitem"
              className={`overflow-hidden rounded-2xl border transition ${
                open
                  ? 'border-[#F5E80C]/35 bg-white/[0.05]'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <button
                id={btnId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(card.id)}
                className="flex w-full items-start gap-3 px-5 py-4 text-left sm:px-6 sm:py-5"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E30D13] text-xs font-bold text-white">
                  {String(card.order).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  {kicker ? (
                    <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#F5E80C]">
                      {kicker}
                    </span>
                  ) : null}
                  <span className="mt-1 block font-display text-lg font-bold text-[#F8F5ED] sm:text-xl">
                    {headline}
                  </span>
                </span>
                <ChevronDown
                  className={`mt-1 h-5 w-5 shrink-0 text-white/50 transition duration-300 ${
                    open ? 'rotate-180 text-[#F5E80C]' : ''
                  }`}
                  aria-hidden
                />
              </button>

              <div
                id={panelId}
                role="region"
                aria-labelledby={btnId}
                hidden={!open}
                className="space-y-6 border-t border-white/10 px-5 pb-5 pt-4 sm:px-6 sm:pb-6"
              >
                {card.blocks.map((block, i) => (
                  <GuideBlock key={`${card.id}-${i}`} block={block} fr={fr} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold text-[#F8F5ED]">
          {t('film.procedures.authoritiesTitle')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/55">
          {t('film.procedures.authoritiesSub')}
        </p>
        <div className="mt-6 space-y-3">
          {FILM_AUTHORITIES.map((a) => {
            const id = `auth-${a.id}`;
            const open = openId === id;
            const panelId = `guide-panel-${id}`;
            const btnId = `guide-btn-${id}`;

            return (
              <div
                key={a.id}
                className={`overflow-hidden rounded-2xl border transition ${
                  open
                    ? 'border-[#F5E80C]/35 bg-white/[0.05]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                }`}
              >
                <button
                  id={btnId}
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => toggle(id)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left sm:px-6"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[#F8F5ED]">
                      {fr ? a.nameFr : a.nameEn}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#F5E80C]/85">
                      {fr ? a.cityFr : a.cityEn}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-white/50 transition duration-300 ${
                      open ? 'rotate-180 text-[#F5E80C]' : ''
                    }`}
                    aria-hidden
                  />
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  hidden={!open}
                  className="border-t border-white/10 px-5 pb-5 pt-4 sm:px-6"
                >
                  <p className="text-sm leading-relaxed text-white/70">
                    {fr ? a.roleFr : a.roleEn}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-white/45">
                    {fr ? a.contactHintFr : a.contactHintEn}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
