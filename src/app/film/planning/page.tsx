'use client';

import { useCallback, useState } from 'react';
import { Download } from 'lucide-react';

import { FILM_CHECKLISTS, checklistToMarkdown } from '@/lib/film/checklists';
import { useLocale } from '@/lib/i18n';

export default function FilmPlanningPage() {
  const { t, locale } = useLocale();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = useCallback((id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const download = useCallback(
    (checklistId: string) => {
      const checklist = FILM_CHECKLISTS.find((c) => c.id === checklistId);
      if (!checklist) return;
      const md = checklistToMarkdown(checklist, locale);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartmboa-${checklist.id}-${locale}.md`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [locale],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="max-w-2xl">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#FCD116]">
          {t('film.nav.planning')}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">
          {t('film.planning.title')}
        </h1>
        <p className="mt-3 text-sm text-white/60 sm:text-base">{t('film.planning.sub')}</p>
      </header>

      <div className="mt-10 space-y-8">
        {FILM_CHECKLISTS.map((list) => (
          <section
            key={list.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-6 sm:px-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-[#F8F5ED]">
                  {locale === 'fr' ? list.titleFr : list.titleEn}
                </h2>
                <p className="mt-1 text-sm text-white/55">
                  {locale === 'fr' ? list.summaryFr : list.summaryEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => download(list.id)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-[#FCD116] hover:border-[#FCD116]"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                {t('film.planning.download')}
              </button>
            </div>
            <ul className="mt-5 space-y-2">
              {list.items.map((item) => {
                const id = `${list.id}:${item.id}`;
                const on = !!checked[id];
                return (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04]">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(id)}
                        className="mt-1 h-4 w-4 accent-[#CE1126]"
                      />
                      <span
                        className={`text-sm ${on ? 'text-white/40 line-through' : 'text-white/80'}`}
                      >
                        {locale === 'fr' ? item.labelFr : item.labelEn}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
