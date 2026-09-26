/** Validation helpers for the Planifier form (i18n keys via t()). */

export const INTEREST_OPTIONS = [
  'Culture',
  'Nature',
  'Plages',
  'Gastronomie',
  'Histoire',
  'Aventure',
  'Famille',
  'Marchés',
] as const;

export const STYLE_OPTIONS = [
  'Découverte',
  'Nature',
  'Culture',
  'Famille',
  'Détente',
] as const;

/** Booking help options for the planner questionnaire. */
export const BOOKING_HELP_OPTIONS = [
  'none',
  'lodging',
  'transport',
  'activities',
  'several',
] as const;

export type BookingHelpOption = (typeof BOOKING_HELP_OPTIONS)[number];

export type PlannerField =
  | 'destination'
  | 'startDate'
  | 'endDate'
  | 'travelers'
  | 'budget'
  | 'interests'
  | 'style'
  | 'bookingHelp';

export type PlannerErrors = Partial<Record<PlannerField, string>>;

export type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Night count / date difference (26→29 Sep = 3). */
export function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T12:00:00`).getTime();
  const b = new Date(`${end}T12:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  return Math.round((b - a) / 86_400_000);
}

/** Inclusive calendar days (26→29 Sep = 4 days / 3 nights). */
export function calendarDaysInclusive(start: string, end: string): number {
  const nights = daysBetween(start, end);
  if (!Number.isFinite(nights) || nights < 0) return NaN;
  return nights + 1;
}

export function formatDateLocalized(iso: string, locale: 'fr' | 'en'): string {
  const d = new Date(`${iso}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** @deprecated Prefer formatDateLocalized */
export function formatDateFr(iso: string): string {
  return formatDateLocalized(iso, 'fr');
}

export function defaultStartDate(): string {
  return toISODate(new Date());
}

export function defaultEndDate(): string {
  return addDaysISO(defaultStartDate(), 3);
}

export function parsePositiveInt(raw: string): number | null {
  const n = Number(String(raw).replace(/\s/g, ''));
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export function parseBudgetFcfa(raw: string): number | null {
  const n = Number(String(raw).replace(/[\s_\u00a0]/g, '').replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

const MIN_BUDGET = 10_000;
const MAX_BUDGET = 50_000_000;
const MAX_TRAVELERS = 20;
const MAX_TRIP_DAYS = 30;

export function validateDestination(
  destination: string,
  destinationValid: boolean,
  t: TranslateFn,
): string | undefined {
  const trimmed = destination.trim();
  if (!trimmed) return t('planner.err.destinationRequired');
  if (!destinationValid) return t('planner.err.destinationInvalid');
  return undefined;
}

export function validateDates(
  startDate: string,
  endDate: string,
  t: TranslateFn,
): PlannerErrors {
  const errors: PlannerErrors = {};
  const today = defaultStartDate();

  if (!startDate) {
    errors.startDate = t('planner.err.startRequired');
  } else if (startDate < today) {
    errors.startDate = t('planner.err.startPast');
  }

  if (!endDate) {
    errors.endDate = t('planner.err.endRequired');
  } else if (startDate && endDate <= startDate) {
    errors.endDate = t('planner.err.endAfterStart');
  } else if (startDate && endDate) {
    const days = daysBetween(startDate, endDate);
    if (!Number.isFinite(days) || days < 1) {
      errors.endDate = t('planner.err.endAfterStart');
    } else if (days > MAX_TRIP_DAYS) {
      errors.endDate = t('planner.err.maxDays', { n: MAX_TRIP_DAYS });
    }
  }

  return errors;
}

export function validateTravelers(raw: string, t: TranslateFn): string | undefined {
  const n = parsePositiveInt(raw);
  if (n == null) return t('planner.err.travelers');
  if (n > MAX_TRAVELERS) {
    return t('planner.err.maxTravelers', { n: MAX_TRAVELERS });
  }
  return undefined;
}

export function validateBudget(raw: string, t: TranslateFn): string | undefined {
  const n = parseBudgetFcfa(raw);
  if (n == null) return t('planner.err.budget');
  if (n < MIN_BUDGET) {
    return t('planner.err.budgetMin', {
      n: MIN_BUDGET.toLocaleString('fr-FR'),
    });
  }
  if (n > MAX_BUDGET) {
    return t('planner.err.budgetMax', {
      n: MAX_BUDGET.toLocaleString('fr-FR'),
    });
  }
  return undefined;
}

export function validateInterests(
  selected: string[],
  t: TranslateFn,
): string | undefined {
  if (!selected.length) return t('planner.err.interests');
  return undefined;
}

export function validateStyle(style: string, t: TranslateFn): string | undefined {
  if (!style.trim()) return t('planner.err.style');
  return undefined;
}

export function validateBookingHelp(
  selected: BookingHelpOption[],
  t: TranslateFn,
): string | undefined {
  if (!selected.length) return t('planner.err.bookingHelp');
  return undefined;
}

export function normalizeBookingHelp(
  selected: BookingHelpOption[],
): BookingHelpOption[] {
  if (selected.includes('none')) return ['none'];
  if (selected.includes('several')) {
    return ['lodging', 'transport', 'activities', 'several'];
  }
  return selected.filter((x) => x !== 'none');
}

export function formatDatesLabel(
  startDate: string,
  endDate: string,
  locale: 'fr' | 'en' = 'fr',
  t?: TranslateFn,
): string {
  const nights = daysBetween(startDate, endDate);
  const calendarDays = calendarDaysInclusive(startDate, endDate);
  if (!Number.isFinite(nights) || !Number.isFinite(calendarDays)) {
    return `${formatDateLocalized(startDate, locale)} → ${formatDateLocalized(endDate, locale)}`;
  }
  const dayWord =
    t != null
      ? calendarDays > 1
        ? t('planner.days')
        : t('planner.day')
      : `jour${calendarDays > 1 ? 's' : ''}`;
  const nightWord =
    locale === 'en'
      ? nights === 1
        ? 'night'
        : 'nights'
      : nights === 1
        ? 'nuit'
        : 'nuits';
  const dayLabel = `${calendarDays} ${dayWord} / ${nights} ${nightWord}`;
  return `${formatDateLocalized(startDate, locale)} → ${formatDateLocalized(endDate, locale)} (${dayLabel})`;
}
