'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';

import { SmartMboaIntro } from '@/components/intro/SmartMboaIntro';
import { APP_NAME } from '@/lib/config';
import { useLocale } from '@/lib/i18n';

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

function LoginForm() {
  const { t, locale, toggleLocale } = useLocale();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('error') ? t('login.invalid') : null,
  );
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(() => !searchParams.get('error'));
  const onIntroComplete = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    document.documentElement.classList.toggle('intro-playing', showIntro);
    return () => document.documentElement.classList.remove('intro-playing');
  }, [showIntro]);

  if (showIntro) return <SmartMboaIntro onComplete={onIntroComplete} />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const username = String(form.get('username') ?? '');
    const password = String(form.get('password') ?? '');
    if (!username.trim() || !password) {
      setError(t('login.required'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? t('login.invalid') : t('login.error'));
        setLoading(false);
        return;
      }
      window.location.replace(safeNext(searchParams.get('next')));
    } catch {
      setError(t('login.error'));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100svh] flex-col bg-[var(--ivory)]">
      <div className="flex h-1.5" aria-hidden>
        <div className="flex-1 bg-[#007A5E]" />
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-[#FCD116]" />
      </div>

      <div className="flex justify-end px-4 pt-4">
        <button
          type="button"
          onClick={toggleLocale}
          className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#535557] hover:border-[#007A5E] hover:text-[#007A5E]"
          aria-label={t('nav.lang')}
        >
          {locale.toUpperCase()}
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <Image
              src="/brand/logo.png"
              alt={APP_NAME}
              width={475}
              height={378}
              priority
              className="h-24 w-auto object-contain"
            />
            <h1 className="mt-4 text-2xl font-bold text-[var(--ink)]">{t('login.title')}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{t('login.subtitle')}</p>
          </div>

          <form
            method="post"
            action="/api/auth/login"
            onSubmit={onSubmit}
            noValidate
            className="space-y-4 rounded-2xl bg-white p-6 shadow-md ring-1 ring-black/5"
          >
            <input type="hidden" name="next" value={safeNext(searchParams.get('next'))} />
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                {t('login.username')}
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden />
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoFocus
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#007A5E] focus:ring-2 focus:ring-[#007A5E]/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--ink)]">
                {t('login.password')}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-[#007A5E] focus:ring-2 focus:ring-[#007A5E]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--muted)] hover:text-[#007A5E]"
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <p role="alert" className="rounded-lg bg-[#CE1126]/10 px-3 py-2 text-sm text-[#CE1126]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#007A5E] py-2.5 text-sm font-semibold text-white transition hover:bg-[#005C46] disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {t('login.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#050505]" aria-hidden />}>
      <LoginForm />
    </Suspense>
  );
}
