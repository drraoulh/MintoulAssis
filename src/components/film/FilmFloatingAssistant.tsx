'use client';

import { useEffect, useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Clapperboard, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { FilmAssistantChat } from '@/components/film/FilmAssistantChat';
import { useLocale } from '@/lib/i18n';

/**
 * Floating Film AI — bottom-right on Film pages (hidden on the full /film/assistant page).
 */
export function FilmFloatingAssistant() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();

  const onAssistantPage =
    pathname === '/film/assistant' || pathname.startsWith('/film/assistant/');

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || onAssistantPage) return null;

  return createPortal(
    <>
      {!open ? (
        <button
          type="button"
          id="film-ai-fab"
          data-film-ai-fab
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-4 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-[#CE1126] text-white shadow-[0_8px_28px_rgba(206,17,38,0.45)] transition hover:scale-105 hover:bg-[#b50e21] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FCD116] md:bottom-6 md:right-6"
          style={{ zIndex: 9999 }}
          aria-label={t('film.assistant.fab')}
          aria-haspopup="dialog"
          aria-expanded={false}
        >
          <Clapperboard className="pointer-events-none h-6 w-6" aria-hidden />
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FCD116] px-1 text-[9px] font-black text-black">
            IA
          </span>
        </button>
      ) : (
        <div
          id="film-ai-panel"
          className="fixed inset-0 z-[9999]"
          style={{ zIndex: 9999 }}
          role="dialog"
          aria-modal
          aria-labelledby={panelId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label={t('nav.close')}
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-0 right-0 flex h-[min(92svh,740px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl sm:bottom-4 sm:right-4 sm:rounded-2xl md:h-[min(85vh,680px)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <p id={panelId} className="text-sm font-semibold text-[#F8F5ED]">
                {t('film.assistant.title')}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-white/60 hover:bg-white/5 hover:text-white"
                aria-label={t('nav.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <FilmAssistantChat embedded />
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
