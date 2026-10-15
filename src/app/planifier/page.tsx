'use client';

import { FormEvent, useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  MapPin,
  Users,
  Wallet,
} from 'lucide-react';

import { ResponseRenderer, BudgetCard } from '@/components/assistant/ResponseRenderer';
import { DestinationAutocomplete } from '@/components/planner/DestinationAutocomplete';
import { PageTransition, SlideUp } from '@/components/motion';
import { Button, Input, Select, TextArea, ThinkingDots } from '@/components/ui';
import { friendlyError, sendChatMessage } from '@/lib/api/client';
import { resolveCameroonDestination } from '@/lib/cameroon-destinations';
import { useLocale } from '@/lib/i18n';
import {
  BOOKING_HELP_OPTIONS,
  INTEREST_OPTIONS,
  STYLE_OPTIONS,
  addDaysISO,
  calendarDaysInclusive,
  daysBetween,
  defaultEndDate,
  defaultStartDate,
  formatDateLocalized,
  formatDatesLabel,
  normalizeBookingHelp,
  parseBudgetFcfa,
  parsePositiveInt,
  validateBookingHelp,
  validateBudget,
  validateDates,
  validateDestination,
  validateInterests,
  validateStyle,
  validateTravelers,
  type BookingHelpOption,
  type PlannerErrors,
  type PlannerField,
} from '@/lib/planner-validation';
import { loadTrip, setTripMeta } from '@/lib/trip-store';
import { structuredFromChatResponse } from '@/lib/utils/response';
import type { ChatResponse } from '@/lib/types';

const STEP_DEFS = [
  { id: 'destination', labelKey: 'planner.step.destination', hintKey: 'planner.step.destinationHint' },
  { id: 'dates', labelKey: 'planner.step.dates', hintKey: 'planner.step.datesHint' },
  { id: 'travelers', labelKey: 'planner.step.travelers', hintKey: 'planner.step.travelersHint' },
  { id: 'budget', labelKey: 'planner.step.budget', hintKey: 'planner.step.budgetHint' },
  { id: 'preferences', labelKey: 'planner.step.preferences', hintKey: 'planner.step.preferencesHint' },
  { id: 'bookings', labelKey: 'planner.step.bookings', hintKey: 'planner.step.bookingsHint' },
  { id: 'confirm', labelKey: 'planner.step.confirm', hintKey: 'planner.step.confirmHint' },
] as const;

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-[var(--danger)]" role="alert">
      {message}
    </p>
  );
}

function fieldClass(hasError: boolean) {
  return hasError
    ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/30'
    : '';
}

export default function PlanifierPage() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const STEPS = STEP_DEFS.map((s) => ({
    id: s.id,
    label: t(s.labelKey),
    hint: t(s.hintKey),
  }));
  const formId = useId();

  const [step, setStep] = useState(0);
  const [destination, setDestination] = useState('');
  const [destinationValid, setDestinationValid] = useState(false);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [travelers, setTravelers] = useState('2');
  const [budget, setBudget] = useState('150000');
  const [interests, setInterests] = useState<string[]>(['Culture', 'Nature']);
  const [style, setStyle] = useState<string>(STYLE_OPTIONS[0]);
  const [bookingHelp, setBookingHelp] = useState<BookingHelpOption[]>(['none']);
  const [bookingNotes, setBookingNotes] = useState('');
  const [lodgingBudget, setLodgingBudget] = useState('');
  const [transportPref, setTransportPref] = useState('');
  const [fieldErrors, setFieldErrors] = useState<PlannerErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [result, setResult] = useState<ChatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const tripDays = useMemo(
    () => (startDate && endDate ? calendarDaysInclusive(startDate, endDate) : NaN),
    [startDate, endDate],
  );
  const tripNights = useMemo(
    () => (startDate && endDate ? daysBetween(startDate, endDate) : NaN),
    [startDate, endDate],
  );

  useEffect(() => {
    const trip = loadTrip();
    if (trip.destination) {
      setDestination(trip.destination);
      setDestinationValid(!!resolveCameroonDestination(trip.destination));
    }
    if (trip.travelers != null) setTravelers(String(trip.travelers));
    if (trip.budgetFcfa != null) setBudget(String(trip.budgetFcfa));
    if (trip.interests?.length) setInterests(trip.interests);
    if (trip.style) setStyle(trip.style);
    setHydrated(true);
  }, []);

  function clearFieldError(...keys: PlannerField[]) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
  }

  function validateStep(index: number): PlannerErrors {
    if (index === 0) {
      const msg = validateDestination(destination, destinationValid, t);
      return msg ? { destination: msg } : {};
    }
    if (index === 1) return validateDates(startDate, endDate, t);
    if (index === 2) {
      const msg = validateTravelers(travelers, t);
      return msg ? { travelers: msg } : {};
    }
    if (index === 3) {
      const msg = validateBudget(budget, t);
      return msg ? { budget: msg } : {};
    }
    if (index === 4) {
      const errors: PlannerErrors = {};
      const iMsg = validateInterests(interests, t);
      const sMsg = validateStyle(style, t);
      if (iMsg) errors.interests = iMsg;
      if (sMsg) errors.style = sMsg;
      return errors;
    }
    if (index === 5) {
      const msg = validateBookingHelp(bookingHelp, t);
      return msg ? { bookingHelp: msg } : {};
    }
    return {};
  }

  function isStepValid(index: number): boolean {
    return Object.keys(validateStep(index)).length === 0;
  }

  function maxReachableStep(): number {
    let max = 0;
    while (max < STEPS.length - 1 && isStepValid(max)) max += 1;
    return max;
  }

  function goToStep(target: number) {
    if (target === step) return;
    if (target < step) {
      setStep(target);
      setSubmitAttempted(false);
      setError(null);
      return;
    }
    for (let i = step; i < target; i += 1) {
      const errs = validateStep(i);
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        setSubmitAttempted(true);
        setStep(i);
        return;
      }
    }
    setFieldErrors({});
    setSubmitAttempted(false);
    setError(null);
    setStep(target);
  }

  function toggleInterest(label: string) {
    setInterests((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
    );
    clearFieldError('interests');
  }

  function toggleBookingHelp(option: BookingHelpOption) {
    setBookingHelp((prev) => {
      if (option === 'none') return ['none'];
      if (option === 'several') {
        return normalizeBookingHelp(['lodging', 'transport', 'activities', 'several']);
      }
      const withoutNone = prev.filter((x) => x !== 'none' && x !== 'several');
      const next = withoutNone.includes(option)
        ? withoutNone.filter((x) => x !== option)
        : [...withoutNone, option];
      return next.length ? normalizeBookingHelp(next) : ['none'];
    });
    clearFieldError('bookingHelp');
  }

  const wantsBookingHelp = !bookingHelp.includes('none') && bookingHelp.length > 0;
  const wantsLodging =
    bookingHelp.includes('lodging') || bookingHelp.includes('several');
  const wantsTransport =
    bookingHelp.includes('transport') || bookingHelp.includes('several');
  const wantsActivities =
    bookingHelp.includes('activities') || bookingHelp.includes('several');

  async function onGenerate() {
    const allErrors: PlannerErrors = {
      ...validateStep(0),
      ...validateStep(1),
      ...validateStep(2),
      ...validateStep(3),
      ...validateStep(4),
      ...validateStep(5),
    };
    if (Object.keys(allErrors).length) {
      setFieldErrors(allErrors);
      setSubmitAttempted(true);
      const firstBad = [0, 1, 2, 3, 4, 5].find(
        (i) => Object.keys(validateStep(i)).length,
      );
      if (firstBad != null) setStep(firstBad);
      setError(t('planner.fixBeforeGenerate'));
      return;
    }

    const matched = resolveCameroonDestination(destination);
    if (!matched) {
      setFieldErrors({
        destination: t('planner.err.destinationInvalid'),
      });
      setStep(0);
      return;
    }

    const destLabel = matched.name;
    const nights = daysBetween(startDate, endDate);
    const calendarDays = calendarDaysInclusive(startDate, endDate);
    const travelersN = parsePositiveInt(travelers) ?? 1;
    const budgetN = parseBudgetFcfa(budget) ?? 0;
    const interestsLabel = interests.map((i) => t(`planner.interest.${i}`)).join(', ');
    const styleLabel = t(`planner.style.${style}`);
    const datesLabel = formatDatesLabel(startDate, endDate, locale, t);

    const bookingNormalized = normalizeBookingHelp(bookingHelp);
    const bookingLabels = bookingNormalized.includes('none')
      ? locale === 'fr'
        ? 'aucune aide réservation (itinéraire seulement)'
        : 'no booking help (itinerary only)'
      : bookingNormalized
          .filter((b) => b !== 'several')
          .map((b) => t(`planner.booking.${b}`))
          .join(' ; ');

    const bookingExtraParts: string[] = [];
    if (wantsLodging && lodgingBudget.trim()) {
      bookingExtraParts.push(
        locale === 'fr'
          ? `budget hébergement : ${lodgingBudget.trim()} FCFA`
          : `lodging budget: ${lodgingBudget.trim()} FCFA`,
      );
    }
    if (wantsTransport && transportPref.trim()) {
      bookingExtraParts.push(
        locale === 'fr'
          ? `transport préféré : ${transportPref.trim()}`
          : `preferred transport: ${transportPref.trim()}`,
      );
    }
    if (bookingNotes.trim()) {
      bookingExtraParts.push(
        locale === 'fr'
          ? `précisions : ${bookingNotes.trim()}`
          : `notes: ${bookingNotes.trim()}`,
      );
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const startLabel = formatDateLocalized(startDate, locale === 'en' ? 'en' : 'fr');
    const endLabel = formatDateLocalized(endDate, locale === 'en' ? 'en' : 'fr');
    const prompt =
      locale === 'fr'
        ? `Je veux un séjour de ${calendarDays} jours calendaires (${nights} nuit${nights > 1 ? 's' : ''}) à ${destLabel} et environs réalistes uniquement (du ${startLabel} au ${endLabel} inclus) avec ${travelersN} voyageurs et un budget global de ${budgetN} FCFA. Centres d'intérêt : ${interestsLabel}. Style : ${styleLabel}. Aide réservations : ${bookingLabels}.${bookingExtraParts.length ? ` ${bookingExtraParts.join('. ')}.` : ''} Produis un itinéraire jour par jour daté pour CHAQUE jour du ${startLabel} au ${endLabel} inclus (Jour 1 = ${startLabel}, …, Jour ${calendarDays} = ${endLabel}) — ne saute pas le dernier jour. Reste à ${destLabel} / environs (pas de destinations lointaines). Distingue clairement recommandations et réservations (aucune réservation n'est confirmée par SmartMboa).`
        : `I want a ${calendarDays}-calendar-day stay (${nights} night${nights > 1 ? 's' : ''}) in ${destLabel} and realistic surroundings only (from ${startLabel} to ${endLabel} inclusive) with ${travelersN} travelers and an overall budget of ${budgetN} FCFA. Interests: ${interestsLabel}. Style: ${styleLabel}. Booking help: ${bookingLabels}.${bookingExtraParts.length ? ` ${bookingExtraParts.join('. ')}.` : ''} Produce a dated day-by-day itinerary for EVERY day from ${startLabel} to ${endLabel} inclusive (Day 1 = ${startLabel}, …, Day ${calendarDays} = ${endLabel}) — do not drop the last day. Stay in ${destLabel} / surroundings (no distant destinations). Clearly distinguish recommendations from bookings (SmartMboa never confirms a reservation).`;

    try {
      const res = await sendChatMessage({ message: prompt, locale });
      setResult(res);
      setTripMeta({
        destination: destLabel,
        dates: datesLabel,
        travelers: travelersN,
        budgetFcfa: budgetN,
        interests,
        style,
        itineraryText: res.message,
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validateStep(step);
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setSubmitAttempted(true);
      return;
    }
    setFieldErrors({});
    setSubmitAttempted(false);
    setError(null);
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    void onGenerate();
  }

  const progressPct = ((step + 1) / STEPS.length) * 100;
  const current = STEPS[step];
  const reachable = hydrated ? maxReachableStep() : 0;

  const destErrorId = `${formId}-dest-err`;
  const startErrorId = `${formId}-start-err`;
  const endErrorId = `${formId}-end-err`;
  const travelersErrorId = `${formId}-travelers-err`;
  const budgetErrorId = `${formId}-budget-err`;
  const interestsErrorId = `${formId}-interests-err`;
  const styleErrorId = `${formId}-style-err`;
  const bookingHelpErrorId = `${formId}-booking-err`;

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-12">
        <h1 className="font-display text-4xl font-bold text-[var(--green-deep)]">
          {t('planner.title')}
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          {t('planner.sub')}
        </p>

        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
            <span>
              {t('planner.stepOf', { current: step + 1, total: STEPS.length })}
            </span>
            <span>{Math.round(progressPct)} %</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--mint-soft)]"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-label={t('planner.progressAria')}
          >
            <div
              className="h-full rounded-full bg-[var(--green-deep)] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <ol className="mt-4 flex gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:gap-2 sm:overflow-visible">
            {STEPS.map((s, i) => {
              const done = i < step && isStepValid(i);
              const active = i === step;
              const locked = i > reachable && i > step;
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => goToStep(i)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-[var(--green-deep)] text-white'
                        : done
                          ? 'bg-[var(--mint-soft)] text-[var(--green-deep)]'
                          : locked
                            ? 'cursor-not-allowed bg-[var(--line)] text-[var(--muted)] opacity-60'
                            : 'bg-[var(--line)] text-[var(--muted)] hover:bg-[var(--mint-soft)]'
                    }`}
                    aria-current={active ? 'step' : undefined}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <span className="tabular-nums">{i + 1}.</span>
                    )}
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="mt-8 space-y-5 rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">
              {current.label}
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-[var(--green-deep)]">
              {current.hint}
            </p>
          </div>

          <SlideUp key={step} className="space-y-4">
            {step === 0 && (
              <div>
                <label
                  htmlFor={`${formId}-destination`}
                  className="block text-sm font-medium text-[var(--ink)]"
                >
                  {t('planner.destLabel')} <span className="text-[var(--danger)]">*</span>
                </label>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {t('planner.destHint')}
                </p>
                <div className="mt-2">
                  <DestinationAutocomplete
                    id={`${formId}-destination`}
                    value={destination}
                    onChange={(v) => {
                      setDestination(v);
                      clearFieldError('destination');
                      setError(null);
                    }}
                    onValidityChange={setDestinationValid}
                    locale={locale}
                    placeholder={t('planner.destPlaceholder')}
                    required
                    aria-describedby={
                      fieldErrors.destination ? destErrorId : undefined
                    }
                  />
                </div>
                <FieldError id={destErrorId} message={fieldErrors.destination} />
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`${formId}-start`}
                    className="block text-sm font-medium"
                  >
                    {t('planner.startDate')} <span className="text-[var(--danger)]">*</span>
                  </label>
                  <Input
                    id={`${formId}-start`}
                    type="date"
                    className={`mt-1 ${fieldClass(!!fieldErrors.startDate)}`}
                    value={startDate}
                    min={defaultStartDate()}
                    aria-invalid={!!fieldErrors.startDate}
                    aria-describedby={
                      fieldErrors.startDate ? startErrorId : undefined
                    }
                    onChange={(e) => {
                      const next = e.target.value;
                      setStartDate(next);
                      clearFieldError('startDate', 'endDate');
                      if (endDate && next && endDate <= next) {
                        setEndDate(addDaysISO(next, 3));
                      }
                    }}
                    required
                  />
                  <FieldError id={startErrorId} message={fieldErrors.startDate} />
                </div>
                <div>
                  <label
                    htmlFor={`${formId}-end`}
                    className="block text-sm font-medium"
                  >
                    {t('planner.endDate')} <span className="text-[var(--danger)]">*</span>
                  </label>
                  <Input
                    id={`${formId}-end`}
                    type="date"
                    className={`mt-1 ${fieldClass(!!fieldErrors.endDate)}`}
                    value={endDate}
                    min={
                      startDate ? addDaysISO(startDate, 1) : defaultStartDate()
                    }
                    aria-invalid={!!fieldErrors.endDate}
                    aria-describedby={
                      fieldErrors.endDate ? endErrorId : undefined
                    }
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      clearFieldError('endDate');
                    }}
                    required
                  />
                  <FieldError id={endErrorId} message={fieldErrors.endDate} />
                </div>
                {Number.isFinite(tripDays) &&
                Number.isFinite(tripNights) &&
                tripDays >= 1 &&
                !fieldErrors.endDate ? (
                  <p className="text-sm text-[var(--green)] sm:col-span-2">
                    {t('planner.duration')}{' '}
                    <strong>
                      {tripDays}{' '}
                      {tripDays > 1 ? t('planner.days') : t('planner.day')}
                      {' / '}
                      {tripNights}{' '}
                      {locale === 'en'
                        ? tripNights === 1
                          ? 'night'
                          : 'nights'
                        : tripNights === 1
                          ? 'nuit'
                          : 'nuits'}
                    </strong>
                  </p>
                ) : null}
              </div>
            )}

            {step === 2 && (
              <div>
                <label
                  htmlFor={`${formId}-travelers`}
                  className="block text-sm font-medium"
                >
                  {t('planner.travelersLabel')} <span className="text-[var(--danger)]">*</span>
                </label>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {t('planner.travelersHint')}
                </p>
                <Input
                  id={`${formId}-travelers`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  step={1}
                  className={`mt-2 ${fieldClass(!!fieldErrors.travelers)}`}
                  value={travelers}
                  aria-invalid={!!fieldErrors.travelers}
                  aria-describedby={
                    fieldErrors.travelers ? travelersErrorId : undefined
                  }
                  onChange={(e) => {
                    setTravelers(e.target.value);
                    clearFieldError('travelers');
                  }}
                  required
                />
                <FieldError
                  id={travelersErrorId}
                  message={fieldErrors.travelers}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setTravelers(String(n));
                        clearFieldError('travelers');
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        travelers === String(n)
                          ? 'bg-[var(--green-deep)] text-white'
                          : 'bg-[var(--mint-soft)] text-[var(--green-deep)] hover:bg-[var(--line)]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <label
                  htmlFor={`${formId}-budget`}
                  className="block text-sm font-medium"
                >
                  {t('planner.budgetLabel')} <span className="text-[var(--danger)]">*</span>
                </label>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {t('planner.budgetHint')}
                </p>
                <Input
                  id={`${formId}-budget`}
                  type="number"
                  inputMode="numeric"
                  min={10000}
                  step={5000}
                  placeholder="150000"
                  className={`mt-2 ${fieldClass(!!fieldErrors.budget)}`}
                  value={budget}
                  aria-invalid={!!fieldErrors.budget}
                  aria-describedby={
                    fieldErrors.budget ? budgetErrorId : undefined
                  }
                  onChange={(e) => {
                    setBudget(e.target.value);
                    clearFieldError('budget');
                  }}
                  required
                />
                <FieldError id={budgetErrorId} message={fieldErrors.budget} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: '50 000', value: '50000' },
                    { label: '150 000', value: '150000' },
                    { label: '300 000', value: '300000' },
                    { label: '500 000', value: '500000' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setBudget(opt.value);
                        clearFieldError('budget');
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        budget === opt.value
                          ? 'bg-[var(--green-deep)] text-white'
                          : 'bg-[var(--mint-soft)] text-[var(--green-deep)] hover:bg-[var(--line)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <>
                <fieldset>
                  <legend className="text-sm font-medium">
                    {t('planner.interests')}{' '}
                    <span className="text-[var(--danger)]">*</span>
                  </legend>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {t('planner.interestsHint')}
                  </p>
                  <div
                    className="mt-3 flex flex-wrap gap-2"
                    role="group"
                    aria-describedby={
                      fieldErrors.interests ? interestsErrorId : undefined
                    }
                  >
                    {INTEREST_OPTIONS.map((label) => {
                      const selected = interests.includes(label);
                      return (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleInterest(label)}
                          className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                            selected
                              ? 'bg-[var(--green-deep)] text-white'
                              : 'bg-[var(--mint-soft)] text-[var(--green-deep)] hover:bg-[var(--line)]'
                          }`}
                        >
                          {t(`planner.interest.${label}`)}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError
                    id={interestsErrorId}
                    message={fieldErrors.interests}
                  />
                </fieldset>

                <div>
                  <label
                    htmlFor={`${formId}-style`}
                    className="block text-sm font-medium"
                  >
                    {t('planner.style')} <span className="text-[var(--danger)]">*</span>
                  </label>
                  <Select
                    id={`${formId}-style`}
                    className={`mt-1 ${fieldClass(!!fieldErrors.style)}`}
                    value={style}
                    aria-invalid={!!fieldErrors.style}
                    aria-describedby={
                      fieldErrors.style ? styleErrorId : undefined
                    }
                    onChange={(e) => {
                      setStyle(e.target.value);
                      clearFieldError('style');
                    }}
                  >
                    {STYLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {t(`planner.style.${opt}`)}
                      </option>
                    ))}
                  </Select>
                  <FieldError id={styleErrorId} message={fieldErrors.style} />
                </div>
              </>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <fieldset>
                  <legend className="text-sm font-medium text-[var(--ink)]">
                    {t('planner.step.bookingsHint')}
                  </legend>
                  <div
                    className="mt-3 grid gap-2"
                    role="group"
                    aria-describedby={
                      fieldErrors.bookingHelp ? bookingHelpErrorId : undefined
                    }
                  >
                    {BOOKING_HELP_OPTIONS.map((opt) => {
                      const selected = bookingHelp.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleBookingHelp(opt)}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                            selected
                              ? 'border-[var(--green-deep)] bg-[var(--green-deep)] text-white'
                              : 'border-[var(--line)] bg-[var(--ivory)] text-[var(--green-deep)] hover:border-[var(--green)]'
                          }`}
                        >
                          {t(`planner.booking.${opt}`)}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError
                    id={bookingHelpErrorId}
                    message={fieldErrors.bookingHelp}
                  />
                </fieldset>

                {wantsBookingHelp ? (
                  <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--mint-soft)]/30 p-4">
                    {wantsLodging ? (
                      <div>
                        <label
                          htmlFor={`${formId}-lodging-budget`}
                          className="block text-sm font-medium"
                        >
                          {t('planner.booking.lodgingBudget')}
                        </label>
                        <Input
                          id={`${formId}-lodging-budget`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={5000}
                          className="mt-1.5"
                          value={lodgingBudget}
                          onChange={(e) => setLodgingBudget(e.target.value)}
                          placeholder="50000"
                        />
                      </div>
                    ) : null}
                    {wantsTransport ? (
                      <div>
                        <label
                          htmlFor={`${formId}-transport-pref`}
                          className="block text-sm font-medium"
                        >
                          {t('planner.booking.transportPref')}
                        </label>
                        <Input
                          id={`${formId}-transport-pref`}
                          className="mt-1.5"
                          value={transportPref}
                          onChange={(e) => setTransportPref(e.target.value)}
                          placeholder="Bus, taxi, location…"
                        />
                      </div>
                    ) : null}
                    <div>
                      <label
                        htmlFor={`${formId}-booking-notes`}
                        className="block text-sm font-medium"
                      >
                        {t('planner.booking.notes')}
                      </label>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {t('planner.booking.notesHint')}
                      </p>
                      <TextArea
                        id={`${formId}-booking-notes`}
                        className="mt-1.5 min-h-[5.5rem]"
                        value={bookingNotes}
                        onChange={(e) => setBookingNotes(e.target.value)}
                        placeholder={t('planner.booking.notesPlaceholder')}
                      />
                    </div>
                    {wantsActivities ? (
                      <p className="text-xs text-[var(--muted)]">
                        {locale === 'fr'
                          ? 'Les activités / visites seront proposées comme recommandations à réserver auprès des prestataires.'
                          : 'Activities / visits will be suggested as recommendations to book with providers.'}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}

            {step === 6 && (
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--mint-soft)]/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">
                  {t('planner.summary')}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--green)]"
                      aria-hidden
                    />
                    <span>
                      <span className="text-[var(--muted)]">{t('planner.summaryDest')}</span>
                      <strong>{destination.trim() || '—'}</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Calendar
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--green)]"
                      aria-hidden
                    />
                    <span>
                      <span className="text-[var(--muted)]">{t('planner.summaryDates')}</span>
                      <strong>
                        {startDate && endDate
                          ? formatDatesLabel(startDate, endDate, locale, t)
                          : '—'}
                      </strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--green)]"
                      aria-hidden
                    />
                    <span>
                      <span className="text-[var(--muted)]">{t('planner.summaryTravelers')}</span>
                      <strong>{travelers}</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Wallet
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--green)]"
                      aria-hidden
                    />
                    <span>
                      <span className="text-[var(--muted)]">{t('planner.summaryBudget')}</span>
                      <strong>
                        {(parseBudgetFcfa(budget) ?? 0).toLocaleString('fr-FR')}{' '}
                        FCFA
                      </strong>
                    </span>
                  </li>
                  <li className="text-sm">
                    <span className="text-[var(--muted)]">{t('planner.summaryInterests')}</span>
                    <strong>
                      {interests.map((i) => t(`planner.interest.${i}`)).join(', ') || '—'}
                    </strong>
                  </li>
                  <li className="text-sm">
                    <span className="text-[var(--muted)]">{t('planner.summaryStyle')}</span>
                    <strong>{t(`planner.style.${style}`)}</strong>
                  </li>
                  <li className="text-sm">
                    <span className="text-[var(--muted)]">{t('planner.summaryBookings')}</span>
                    <strong>
                      {bookingHelp.includes('none')
                        ? t('planner.booking.none')
                        : bookingHelp
                            .filter((b) => b !== 'several')
                            .map((b) => t(`planner.booking.${b}`))
                            .join(' · ')}
                    </strong>
                  </li>
                </ul>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  {t('planner.summaryNote')}
                </p>
              </div>
            )}
          </SlideUp>

          {submitAttempted && Object.keys(fieldErrors).length > 0 ? (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {t('planner.fixErrors')}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => goToStep(step - 1)}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t('common.back')}
              </Button>
            ) : null}
            <Button type="submit" disabled={loading}>
              {step < STEPS.length - 1 ? (
                <>
                  {t('common.continue')} <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              ) : loading ? (
                t('assistant.thinking')
              ) : (
                t('planner.cta')
              )}
            </Button>
          </div>
        </form>

        {loading ? (
          <div className="mt-6">
            <ThinkingDots label={t('planner.preparing')} />
          </div>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-3xl border border-[var(--line)] bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
                {t('planner.yourTrip')}
              </p>
              <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--green)]" aria-hidden />
                  {destination}
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--green)]" aria-hidden />
                  {Number.isFinite(tripDays) && Number.isFinite(tripNights)
                    ? `${tripDays} ${tripDays > 1 ? t('planner.days') : t('planner.day')} / ${tripNights} ${
                        locale === 'en'
                          ? tripNights === 1
                            ? 'night'
                            : 'nights'
                          : tripNights === 1
                            ? 'nuit'
                            : 'nuits'
                      }`
                    : '—'}
                </li>
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--green)]" aria-hidden />
                  {t('planner.travelersCount', { n: travelers })}
                </li>
                <li className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[var(--green)]" aria-hidden />
                  {(parseBudgetFcfa(budget) ?? 0).toLocaleString('fr-FR')} FCFA
                </li>
              </ul>
              <div className="my-5 h-px bg-[var(--line)]" />
              <ResponseRenderer
                text={result.message}
                ui={structuredFromChatResponse(result)}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/mon-voyage')}
                >
                  {t('planner.viewTrip')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setStep(0);
                  }}
                >
                  {t('planner.editPlan')}
                </Button>
              </div>
            </div>
            {!result.budget ? (
              <BudgetCard
                lines={[
                  {
                    label: t('planner.budgetDeclared'),
                    amount: `${(parseBudgetFcfa(budget) ?? 0).toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR')} FCFA`,
                  },
                ]}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </PageTransition>
  );
}
