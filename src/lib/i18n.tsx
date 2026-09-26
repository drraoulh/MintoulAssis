'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  type Locale,
  readStoredLocale,
  translate,
} from './i18n-dict';

export type { Locale };
export { translate, readStoredLocale };

interface LocaleCtx {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
  toggleLocale: () => void;
  setLocale: (l: Locale) => void;
}

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('smartmboa.locale', l);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'fr' ? 'en' : 'fr');
  }, [locale, setLocale]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, t, toggleLocale, setLocale }),
    [locale, t, toggleLocale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLocale outside provider');
  return ctx;
}
