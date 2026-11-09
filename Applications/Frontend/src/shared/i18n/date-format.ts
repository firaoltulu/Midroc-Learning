import type { AppLanguage } from './i18n';

export type CalendarPreference = 'auto' | 'ethiopic' | 'gregory';

export interface DateFormatOptions {
  calendar?: CalendarPreference;
}

export interface RelativeDateFormatOptions extends DateFormatOptions {
  now?: Date;
}

function toValidDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getCalendar(
  language: AppLanguage,
  preference: CalendarPreference
): 'ethiopic' | 'gregory' {
  if (preference === 'auto') {
    return language === 'am' ? 'ethiopic' : 'gregory';
  }
  return preference;
}

function formatWithCalendar(
  date: Date,
  language: AppLanguage,
  calendar: 'ethiopic' | 'gregory',
  options: Intl.DateTimeFormatOptions
): string {
  const locale = language === 'am' ? 'am-ET' : 'en';

  try {
    const formatter = new Intl.DateTimeFormat(locale, { ...options, calendar });
    if (formatter.resolvedOptions().calendar === calendar) {
      return formatter.format(date);
    }
  } catch {
    // Use the Gregorian fallback below when the requested calendar is unavailable.
  }

  try {
    return new Intl.DateTimeFormat(locale, { ...options, calendar: 'gregory' }).format(date);
  } catch {
    return 'hour' in options ? date.toISOString() : date.toISOString().slice(0, 10);
  }
}

export function formatDate(
  value: Date | string | number,
  language: AppLanguage,
  { calendar = 'auto' }: DateFormatOptions = {}
): string {
  const date = toValidDate(value);
  if (!date) return '—';

  return formatWithCalendar(date, language, getCalendar(language, calendar), {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function formatDateTime(
  value: Date | string | number,
  language: AppLanguage,
  { calendar = 'auto' }: DateFormatOptions = {}
): string {
  const date = toValidDate(value);
  if (!date) return '—';

  return formatWithCalendar(date, language, getCalendar(language, calendar), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function formatRelative(
  value: Date | string | number,
  language: AppLanguage,
  { calendar = 'auto', now = new Date() }: RelativeDateFormatOptions = {}
): string {
  const date = toValidDate(value);
  if (!date) return '—';

  const seconds = (date.getTime() - now.getTime()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1]
  ];
  const [unit, unitSeconds] = units.find(([, size]) => Math.abs(seconds) >= size) ?? units.at(-1)!;
  const amount = Math.round(seconds / unitSeconds);

  try {
    return new Intl.RelativeTimeFormat(language === 'am' ? 'am-ET' : 'en', {
      numeric: 'auto'
    }).format(amount, unit);
  } catch {
    return formatDate(date, language, { calendar });
  }
}
