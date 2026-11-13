import { useTranslation } from 'react-i18next';

/** Duration as "45 min" or "2 h 30 min". */
export function useDurationLabel() {
  const { t } = useTranslation('courses');
  return (minutes: number) => {
    if (minutes < 60) return t('meta.minutes', { count: minutes });
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0
      ? t('meta.hours', { count: hours })
      : t('meta.hoursMinutes', { hours, minutes: rest });
  };
}
