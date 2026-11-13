import type { Language } from './languages';

/** The user's setting: follow the interface language, or force a calendar. */
export type CalendarPreference = 'language' | 'gregorian' | 'ethiopian';

export type Calendar = 'gregory' | 'ethiopic';

export interface DateFormatContext {
  language: Language;
  calendar?: CalendarPreference;
  /** IANA zone; defaults to the browser's. Tests pin it for stable output. */
  timeZone?: string;
}

export type DateInput = Date | string | number;

// Locale-native "medium" patterns keep each language's natural order (13 ኖቬም 2026, Nov 13, 2026).
const DATE: Intl.DateTimeFormatOptions = { dateStyle: 'medium' };
const DATE_TIME: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

/** True when the runtime's Intl data can format the Ethiopian calendar. */
export function supportsEthiopicCalendar(): boolean {
  try {
    return new Intl.DateTimeFormat('am-ET-u-ca-ethiopic').resolvedOptions().calendar === 'ethiopic';
  } catch {
    return false;
  }
}

/**
 * Ethiopian calendar for Amharic and Gregorian for English, unless the user overrides it.
 * Falls back to Gregorian when the runtime has no Ethiopian calendar support.
 */
export function resolveCalendar(
  language: Language,
  preference: CalendarPreference = 'language',
): Calendar {
  const wanted: Calendar =
    preference === 'gregorian'
      ? 'gregory'
      : preference === 'ethiopian'
        ? 'ethiopic'
        : language === 'am'
          ? 'ethiopic'
          : 'gregory';
  return wanted === 'ethiopic' && !supportsEthiopicCalendar() ? 'gregory' : wanted;
}

/** Locale tag with the calendar and Latin (Arabic) digits, e.g. `am-ET-u-ca-ethiopic-nu-latn`. */
function localeTag(language: Language, calendar: Calendar): string {
  return `${language === 'am' ? 'am-ET' : 'en-US'}-u-ca-${calendar}-nu-latn`;
}

function toDate(input: DateInput): Date | null {
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Some ICU versions print a placeholder era ("ERA1") for the Ethiopian calendar; the era is
 * implied in everyday use, so drop it together with the separator before it.
 */
function withoutEra(parts: Intl.DateTimeFormatPart[]): string {
  const kept = parts.filter((part, index) => {
    if (part.type === 'era') return false;
    return !(part.type === 'literal' && parts[index + 1]?.type === 'era');
  });
  return kept
    .map((part) => part.value)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function format(input: DateInput, context: DateFormatContext, options: Intl.DateTimeFormatOptions) {
  const date = toDate(input);
  if (!date) return '';
  const calendar = resolveCalendar(context.language, context.calendar);
  try {
    const formatter = new Intl.DateTimeFormat(localeTag(context.language, calendar), {
      ...options,
      ...(context.timeZone ? { timeZone: context.timeZone } : {}),
    });
    return calendar === 'ethiopic'
      ? withoutEra(formatter.formatToParts(date))
      : formatter.format(date);
  } catch {
    // Last resort: an unambiguous ISO date rather than nothing.
    return date
      .toISOString()
      .slice(0, options.timeStyle ? 16 : 10)
      .replace('T', ' ');
  }
}

/** e.g. "Nov 13, 2026" / "4 ኅዳር 2019". Invalid input returns an empty string. */
export function formatDate(input: DateInput, context: DateFormatContext): string {
  return format(input, context, DATE);
}

/** e.g. "Nov 13, 2026, 9:30 AM" / "4 ኅዳር 2019 9:30 ጥዋት". */
export function formatDateTime(input: DateInput, context: DateFormatContext): string {
  return format(input, context, DATE_TIME);
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
];

/**
 * "3 hours ago" / "ከ3 ሰዓቶች በፊት" for the last week (or the next), otherwise the date in the
 * user's calendar.
 */
export function formatRelative(
  input: DateInput,
  context: DateFormatContext & { now?: DateInput },
): string {
  const date = toDate(input);
  const now = toDate(context.now ?? Date.now());
  if (!date || !now) return '';

  let value = (date.getTime() - now.getTime()) / 1000;
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(value) < size) {
      try {
        return new Intl.RelativeTimeFormat(
          context.language === 'am' ? 'am-ET-u-nu-latn' : 'en-US-u-nu-latn',
          { numeric: 'auto' },
        ).format(Math.round(value), unit);
      } catch {
        return formatDateTime(date, context);
      }
    }
    value /= size;
  }
  return formatDate(date, context);
}
