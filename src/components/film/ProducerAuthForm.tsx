'use client';

import { FormEvent, useEffect, useId, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  FileText,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';

import {
  getLocalProfile,
  saveProfileAuthentication,
} from '@/lib/film/profile';
import {
  EMPTY_AUTH_FIELDS,
  OPTIONAL_AGREEMENT,
  OPTIONAL_PROOF,
  PRODUCER_AUTH_ACCEPT,
  buildAuthentication,
  formatFileSize,
  getAuthFileBlob,
  hasRequiredFields,
  preferredProofKind,
  removeAuthFile,
  saveAuthFile,
} from '@/lib/film/producer-auth';
import type {
  ProducerAuthDocKind,
  ProducerAuthDocumentMeta,
  ProducerAuthFields,
  ProducerEntityType,
} from '@/lib/film/types';
import { useLocale } from '@/lib/i18n';

const STEPS = 3;

type Props = {
  onSubmitted?: () => void;
  compact?: boolean;
};

export function ProducerAuthForm({ onSubmitted, compact }: Props) {
  const { t } = useLocale();
  const [step, setStep] = useState(1);
  const [entityType, setEntityType] = useState<ProducerEntityType>('individual');
  const [authFields, setAuthFields] = useState<ProducerAuthFields>({ ...EMPTY_AUTH_FIELDS });
  const [docs, setDocs] = useState<ProducerAuthDocumentMeta[]>([]);
  const [submittedAt, setSubmittedAt] = useState<string | undefined>();
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<ProducerAuthDocKind | null>(null);

  useEffect(() => {
    const existing = getLocalProfile()?.authentication;
    if (!existing) return;
    setEntityType(existing.entityType);
    setDocs(existing.documents);
    setAuthFields({ ...EMPTY_AUTH_FIELDS, ...existing.fields });
    setSubmittedAt(existing.submittedAt);
  }, []);

  const auth = buildAuthentication(entityType, docs, authFields, submittedAt);
  const proofKind = preferredProofKind(entityType);

  function persist(
    nextEntity: ProducerEntityType,
    nextDocs: ProducerAuthDocumentMeta[],
    nextFields: ProducerAuthFields = authFields,
    nextSubmittedAt: string | undefined = submittedAt,
  ) {
    const authentication = buildAuthentication(
      nextEntity,
      nextDocs,
      nextFields,
      nextSubmittedAt,
    );
    saveProfileAuthentication(authentication);
    setDocs(nextDocs);
    setEntityType(nextEntity);
    setAuthFields({ ...EMPTY_AUTH_FIELDS, ...authentication.fields });
    setSubmittedAt(nextSubmittedAt);
  }

  async function onEntityPick(next: ProducerEntityType) {
    if (next === entityType) {
      setStep(2);
      return;
    }
    const allowed = new Set([...OPTIONAL_PROOF, ...OPTIONAL_AGREEMENT]);
    const kept: ProducerAuthDocumentMeta[] = [];
    for (const d of docs) {
      if (allowed.has(d.kind)) kept.push(d);
      else await removeAuthFile(d.kind);
    }
    persist(next, kept, authFields, undefined);
    setAuthMessage(null);
    setStep(2);
  }

  async function onUpload(kind: ProducerAuthDocKind, file: File | undefined) {
    if (!file) return;
    setBusyKind(kind);
    setAuthMessage(null);
    try {
      const meta = await saveAuthFile(kind, file);
      persist(entityType, [...docs.filter((d) => d.kind !== kind), meta]);
      setAuthMessage(t('film.profile.auth.saved'));
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'FILE_TOO_LARGE') setAuthMessage(t('film.profile.auth.error.large'));
      else if (code === 'FILE_TYPE') setAuthMessage(t('film.profile.auth.error.type'));
      else setAuthMessage(t('film.profile.auth.error.generic'));
    } finally {
      setBusyKind(null);
    }
  }

  async function onRemoveDoc(kind: ProducerAuthDocKind) {
    setBusyKind(kind);
    await removeAuthFile(kind);
    persist(
      entityType,
      docs.filter((d) => d.kind !== kind),
      authFields,
      undefined,
    );
    setAuthMessage(t('film.profile.auth.removed'));
    setBusyKind(null);
  }

  async function onViewDoc(kind: ProducerAuthDocKind) {
    const file = await getAuthFileBlob(kind);
    if (!file) return;
    const url = URL.createObjectURL(file.blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function goNextFromIdentity(e: FormEvent) {
    e.preventDefault();
    setAuthMessage(null);
    if (!hasRequiredFields(entityType, authFields)) {
      setAuthMessage(t('film.profile.auth.error.fields'));
      return;
    }
    persist(entityType, docs, authFields, undefined);
    setStep(3);
  }

  function finish(e?: FormEvent) {
    e?.preventDefault();
    setAuthMessage(null);
    if (!hasRequiredFields(entityType, authFields)) {
      setAuthMessage(t('film.profile.auth.error.fields'));
      setStep(2);
      return;
    }
    const when = new Date().toISOString();
    persist(entityType, docs, authFields, when);
    setAuthMessage(t('film.profile.auth.submitted'));
    onSubmitted?.();
  }

  const statusLabel =
    auth.status === 'agreed'
      ? t('film.profile.auth.status.agreed')
      : auth.status === 'ready'
        ? t('film.profile.auth.status.ready')
        : t('film.profile.auth.status.incomplete');

  const stepTitle =
    step === 1
      ? t('film.auth.step1.title')
      : step === 2
        ? t('film.auth.step2.title')
        : t('film.auth.step3.title');

  const stepHint =
    step === 1
      ? t('film.auth.step1.hint')
      : step === 2
        ? t('film.auth.step2.hint')
        : t('film.auth.step3.hint');

  return (
    <div className={compact ? 'space-y-5' : 'space-y-6'}>
      <div>
        {!compact ? (
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[#F5E80C]">
            KYC · MINAC / DCPA
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            className={`font-display font-bold text-[#F8F5ED] ${
              compact ? 'text-2xl sm:text-3xl' : 'mt-2 text-2xl'
            }`}
          >
            {t('film.profile.auth.formTitle')}
          </h2>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              auth.status === 'agreed'
                ? 'bg-[#F5E80C]/15 text-[#F5E80C]'
                : auth.status === 'ready'
                  ? 'bg-[#079941]/20 text-[#7ddea3]'
                  : 'bg-white/5 text-white/50'
            }`}
          >
            {auth.status === 'agreed' ? (
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            )}
            {statusLabel}
          </span>
        </div>
        <p className="mt-2 text-sm text-white/55">{t('film.profile.authSub')}</p>
      </div>

      <ol className="flex items-center gap-2" aria-label={t('film.auth.stepsLabel')}>
        {Array.from({ length: STEPS }, (_, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <li key={n} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? 'bg-[#E30D13] text-white'
                    : done
                      ? 'bg-[#079941] text-white'
                      : 'bg-white/10 text-white/45'
                }`}
              >
                {n}
              </span>
              {n < STEPS ? (
                <span
                  className={`h-px flex-1 ${done ? 'bg-[#079941]/60' : 'bg-white/10'}`}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#F5E80C]">
          {t('film.auth.stepOf', { n: step, total: STEPS })}
        </p>
        <h3 className="mt-1 font-display text-xl font-bold text-[#F8F5ED]">{stepTitle}</h3>
        <p className="mt-1 text-sm text-white/50">{stepHint}</p>
      </div>

      {step === 1 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['individual', t('film.profile.authIndividual')],
              ['company', t('film.profile.authCompany')],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => void onEntityPick(value)}
              className={`rounded-xl border px-4 py-4 text-left text-sm font-semibold transition ${
                entityType === value
                  ? 'border-[#F5E80C]/60 bg-[#F5E80C]/10 text-[#F8F5ED]'
                  : 'border-white/10 bg-black/30 text-white/65 hover:border-white/25'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <form onSubmit={goNextFromIdentity} className="space-y-4">
          {entityType === 'company' ? (
            <>
              <Field
                label={t('film.profile.auth.companyName')}
                value={authFields.companyName ?? ''}
                onChange={(v) => setAuthFields((f) => ({ ...f, companyName: v }))}
                placeholder={t('film.profile.auth.companyNamePh')}
                required
              />
              <Field
                label={t('film.profile.auth.legalRep')}
                value={authFields.legalRepName ?? ''}
                onChange={(v) => setAuthFields((f) => ({ ...f, legalRepName: v }))}
                placeholder={t('film.profile.auth.legalRepPh')}
                required
              />
              <Field
                label={t('film.profile.auth.rccmNumber')}
                value={authFields.rccmNumber ?? ''}
                onChange={(v) => setAuthFields((f) => ({ ...f, rccmNumber: v }))}
                placeholder={t('film.profile.auth.rccmNumberPh')}
                required
              />
            </>
          ) : (
            <>
              <Field
                label={t('film.auth.displayName')}
                value={authFields.legalRepName ?? ''}
                onChange={(v) => setAuthFields((f) => ({ ...f, legalRepName: v }))}
                placeholder={t('film.auth.displayNamePh')}
                required
              />
              <Field
                label={t('film.profile.auth.cniNumber')}
                value={authFields.cniNumber ?? ''}
                onChange={(v) => setAuthFields((f) => ({ ...f, cniNumber: v }))}
                placeholder={t('film.profile.auth.cniNumberPh')}
                required
              />
            </>
          )}
          <Field
            label={t('film.profile.auth.niuNumber')}
            value={authFields.niuNumber ?? ''}
            onChange={(v) => setAuthFields((f) => ({ ...f, niuNumber: v }))}
            placeholder={t('film.profile.auth.niuNumberPh')}
            required
          />
          <Field
            label={t('film.profile.auth.authContact')}
            value={authFields.authContact ?? ''}
            onChange={(v) => setAuthFields((f) => ({ ...f, authContact: v }))}
            placeholder={t('film.profile.auth.authContactPh')}
            required
          />
          {authMessage && step === 2 ? (
            <p className="text-sm text-[#F5E80C]">{authMessage}</p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setAuthMessage(null);
                setStep(1);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/70 hover:border-white/40"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t('film.auth.back')}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E30D13] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#c40b10]"
            >
              {t('film.auth.next')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <form onSubmit={finish} className="space-y-4">
          <DocSlot
            kind={proofKind}
            label={t(`film.profile.auth.doc.${proofKind}`)}
            meta={docs.find((d) => d.kind === proofKind)}
            busy={busyKind === proofKind}
            uploadLabel={t('film.profile.auth.upload')}
            replaceLabel={t('film.profile.auth.replace')}
            removeLabel={t('film.profile.auth.remove')}
            viewLabel={t('film.profile.auth.view')}
            onUpload={(file) => void onUpload(proofKind, file)}
            onRemove={() => void onRemoveDoc(proofKind)}
            onView={() => void onViewDoc(proofKind)}
          />
          <p className="text-xs text-white/40">{t('film.auth.step3.optional')}</p>
          <p className="text-xs text-white/40">{t('film.profile.auth.hint')}</p>
          {authMessage && step === 3 ? (
            <p className="text-sm text-[#F5E80C]">{authMessage}</p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setAuthMessage(null);
                setStep(2);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/70 hover:border-white/40"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t('film.auth.back')}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#079941] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#067a34]"
            >
              {t('film.auth.finish')}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function DocSlot({
  kind,
  label,
  meta,
  busy,
  uploadLabel,
  replaceLabel,
  removeLabel,
  viewLabel,
  onUpload,
  onRemove,
  onView,
}: {
  kind: ProducerAuthDocKind;
  label: string;
  meta?: ProducerAuthDocumentMeta;
  busy: boolean;
  uploadLabel: string;
  replaceLabel: string;
  removeLabel: string;
  viewLabel: string;
  onUpload: (file: File | undefined) => void;
  onRemove: () => void;
  onView: () => void;
}) {
  const inputId = useId();

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              meta ? 'bg-[#079941]/25 text-[#7ddea3]' : 'bg-white/5 text-white/40'
            }`}
          >
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#F8F5ED]">{label}</p>
            {meta ? (
              <p className="mt-0.5 truncate text-xs text-white/50">
                {meta.fileName} · {formatFileSize(meta.size)}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-white/35">—</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {meta ? (
            <>
              <button
                type="button"
                onClick={onView}
                disabled={busy}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:border-white/35 disabled:opacity-50"
              >
                {viewLabel}
              </button>
              <button
                type="button"
                onClick={onRemove}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/55 hover:border-[#E30D13]/50 hover:text-[#ff8a8a] disabled:opacity-50"
              >
                <X className="h-3 w-3" aria-hidden />
                {removeLabel}
              </button>
            </>
          ) : null}
          <label
            htmlFor={inputId}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              meta
                ? 'border border-[#F5E80C]/40 text-[#F5E80C] hover:bg-[#F5E80C]/10'
                : 'bg-[#E30D13] text-white hover:bg-[#c40b10]'
            } ${busy ? 'pointer-events-none opacity-50' : ''}`}
          >
            <Upload className="h-3 w-3" aria-hidden />
            {meta ? replaceLabel : uploadLabel}
          </label>
          <input
            id={inputId}
            type="file"
            accept={PRODUCER_AUTH_ACCEPT}
            className="sr-only"
            disabled={busy}
            data-kind={kind}
            onChange={(e) => {
              onUpload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>
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
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm font-normal normal-case text-[#F8F5ED] outline-none placeholder:text-white/30 focus:border-[#F5E80C]/50"
      />
    </label>
  );
}
