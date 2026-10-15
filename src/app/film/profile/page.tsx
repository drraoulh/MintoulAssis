'use client';

import { FormEvent, useEffect, useState } from 'react';
import { UserCircle2 } from 'lucide-react';

import {
  clearLocalProfile,
  getLocalProfile,
  saveLocalProfile,
} from '@/lib/film/profile';
import type { LocalFilmProfile } from '@/lib/film/types';
import { useLocale } from '@/lib/i18n';

const empty = {
  name: '',
  role: '',
  city: '',
  bio: '',
  specialties: '',
  contact: '',
  projectTitle: '',
};

export default function FilmProfilePage() {
  const { t } = useLocale();
  const [form, setForm] = useState(empty);
  const [saved, setSaved] = useState<LocalFilmProfile | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const existing = getLocalProfile();
    if (existing) {
      setSaved(existing);
      setForm({
        name: existing.name,
        role: existing.role,
        city: existing.city,
        bio: existing.bio,
        specialties: existing.specialties,
        contact: existing.contact,
        projectTitle: existing.projectTitle ?? '',
      });
    }
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim()) {
      setMessage(t('film.profile.required'));
      return;
    }
    const next = saveLocalProfile({
      name: form.name.trim(),
      role: form.role.trim(),
      city: form.city.trim(),
      bio: form.bio.trim(),
      specialties: form.specialties.trim(),
      contact: form.contact.trim(),
      projectTitle: form.projectTitle?.trim() || undefined,
    });
    setSaved(next);
    setMessage(t('film.profile.saved'));
  }

  function onClear() {
    clearLocalProfile();
    setSaved(null);
    setForm(empty);
    setMessage(t('film.profile.cleared'));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      <header>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#FCD116]">
          {t('film.nav.profile')}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#F8F5ED] sm:text-4xl">
          {t('film.profile.title')}
        </h1>
        <p className="mt-3 text-sm text-white/60 sm:text-base">{t('film.profile.sub')}</p>
      </header>

      {saved ? (
        <div className="mt-8 rounded-2xl border border-[#007A5E]/40 bg-[#007A5E]/10 px-5 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#007A5E] text-white">
              <UserCircle2 className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-[#F8F5ED]">{saved.name}</p>
              <p className="text-sm text-[#FCD116]">
                {saved.role}
                {saved.city ? ` · ${saved.city}` : ''}
              </p>
              {saved.projectTitle ? (
                <p className="mt-2 text-sm font-semibold text-white/80">
                  {t('film.profile.project')}: {saved.projectTitle}
                </p>
              ) : null}
              {saved.specialties ? (
                <p className="mt-1 text-sm text-white/60">{saved.specialties}</p>
              ) : null}
              {saved.bio ? <p className="mt-3 text-sm text-white/70">{saved.bio}</p> : null}
              {saved.contact ? (
                <p className="mt-2 text-xs text-white/45">{saved.contact}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field
          label={t('film.profile.name')}
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          required
        />
        <Field
          label={t('film.profile.role')}
          value={form.role}
          onChange={(v) => setForm((f) => ({ ...f, role: v }))}
          required
          placeholder={t('film.profile.rolePlaceholder')}
        />
        <Field
          label={t('film.profile.city')}
          value={form.city}
          onChange={(v) => setForm((f) => ({ ...f, city: v }))}
        />
        <Field
          label={t('film.profile.projectTitle')}
          value={form.projectTitle ?? ''}
          onChange={(v) => setForm((f) => ({ ...f, projectTitle: v }))}
        />
        <Field
          label={t('film.profile.specialties')}
          value={form.specialties}
          onChange={(v) => setForm((f) => ({ ...f, specialties: v }))}
          placeholder={t('film.profile.specialtiesPlaceholder')}
        />
        <label className="block text-xs font-semibold uppercase tracking-wide text-white/45">
          {t('film.profile.bio')}
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            rows={4}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-normal normal-case text-[#F8F5ED] outline-none focus:border-[#FCD116]/50"
          />
        </label>
        <Field
          label={t('film.profile.contact')}
          value={form.contact}
          onChange={(v) => setForm((f) => ({ ...f, contact: v }))}
          placeholder={t('film.profile.contactPlaceholder')}
        />

        {message ? <p className="text-sm text-[#FCD116]">{message}</p> : null}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="submit"
            className="rounded-full bg-[#007A5E] px-6 py-3 text-sm font-bold text-white hover:bg-[#00614b]"
          >
            {t('film.profile.save')}
          </button>
          {saved ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/70 hover:border-white/40"
            >
              {t('film.profile.clear')}
            </button>
          ) : null}
        </div>
      </form>

      <p className="mt-8 text-xs leading-relaxed text-white/40">{t('film.profile.privacy')}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-white/45">
      {label}
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-normal normal-case text-[#F8F5ED] outline-none placeholder:text-white/30 focus:border-[#FCD116]/50"
      />
    </label>
  );
}
