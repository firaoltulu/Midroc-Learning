import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatDate,
  formatDateTime,
  formatRelative,
  type CalendarPreference,
  type DateInput,
} from './format-date';
import { useLanguage } from './use-language';

/** localStorage key for the account setting "Date format" (follow language / Gregorian / Ethiopian). */
export const CALENDAR_STORAGE_KEY = 'midroc.calendar';

const preferences: CalendarPreference[] = ['language', 'gregorian', 'ethiopian'];
const listeners = new Set<() => void>();

export function getCalendarPreference(): CalendarPreference {
  try {
    const saved = localStorage.getItem(CALENDAR_STORAGE_KEY) as CalendarPreference | null;
    return saved && preferences.includes(saved) ? saved : 'language';
  } catch {
    return 'language';
  }
}

export function setCalendarPreference(preference: CalendarPreference): void {
  try {
    if (preference === 'language') localStorage.removeItem(CALENDAR_STORAGE_KEY);
    else localStorage.setItem(CALENDAR_STORAGE_KEY, preference);
  } catch {
    // Storage blocked: nothing to persist.
  }
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCalendarPreference() {
  const preference = useSyncExternalStore<CalendarPreference>(
    subscribe,
    getCalendarPreference,
    () => 'language',
  );
  return [preference, setCalendarPreference] as const;
}

/** Date formatters bound to the current language and the user's calendar setting. */
export function useDateFormat() {
  const language = useLanguage();
  const [calendar] = useCalendarPreference();
  const { t } = useTranslation('common');
  const ethiopicEra = t('dates.ethiopicEra');
  const context = useMemo(
    () => ({ language, calendar, ethiopicEra }),
    [language, calendar, ethiopicEra],
  );

  return {
    formatDate: useCallback((input: DateInput) => formatDate(input, context), [context]),
    formatDateTime: useCallback((input: DateInput) => formatDateTime(input, context), [context]),
    formatRelative: useCallback(
      (input: DateInput, now?: DateInput) =>
        formatRelative(input, now === undefined ? context : { ...context, now }),
      [context],
    ),
  };
}
