import { useTranslation } from 'react-i18next';
import { toLanguage, type Language } from './languages';

/** The current interface language ('en' | 'am'); re-renders when it changes. */
export function useLanguage(): Language {
  const { i18n } = useTranslation();
  return toLanguage(i18n.resolvedLanguage ?? i18n.language);
}
