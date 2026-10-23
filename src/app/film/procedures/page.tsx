'use client';

import { FILM_AUTHORITIES, FILM_PROCEDURE_STEPS } from '@/lib/film/procedures';
import { useLocale } from '@/lib/i18n';

export default function FilmProceduresPage() {
  const { t, locale } = useLocale();
  const steps = [...FILM_PROCEDURE_STEPS].sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="max-w-2xl">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#F5E80C]">
          {t('film.nav.procedures')}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">
          {t('film.procedures.title')}
        </h1>
        <p className="mt-3 text-sm text-white/60 sm:text-base">{t('film.procedures.sub')}</p>
      </header>

      <ol className="mt-10 space-y-4">
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5 sm:gap-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E30D13] text-sm font-bold text-white">
              {step.order}
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F8F5ED]">
                {locale === 'fr' ? step.titleFr : step.titleEn}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                {locale === 'fr' ? step.bodyFr : step.bodyEn}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold text-[#F8F5ED]">
          {t('film.procedures.authoritiesTitle')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-white/55">
          {t('film.procedures.authoritiesSub')}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {FILM_AUTHORITIES.map((a) => (
            <article
              key={a.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-5"
            >
              <h3 className="font-semibold text-[#F8F5ED]">
                {locale === 'fr' ? a.nameFr : a.nameEn}
              </h3>
              <p className="mt-1 text-xs text-[#F5E80C]/85">
                {locale === 'fr' ? a.cityFr : a.cityEn}
              </p>
              <p className="mt-3 text-sm text-white/65">
                {locale === 'fr' ? a.roleFr : a.roleEn}
              </p>
              <p className="mt-2 text-xs text-white/45">
                {locale === 'fr' ? a.contactHintFr : a.contactHintEn}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
