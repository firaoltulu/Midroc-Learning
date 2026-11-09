import { useTranslation } from 'react-i18next';
import { useEffect, type PropsWithChildren } from 'react';
import type { AppLanguage } from './i18n';
import { loadLanguageFont } from './font-loader';

function getLanguage(language: string | undefined): AppLanguage {
  return language?.toLowerCase().startsWith('am') ? 'am' : 'en';
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const { i18n, t } = useTranslation('common');
  const language = getLanguage(i18n.resolvedLanguage ?? i18n.language);
  const title = t('title');

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = title;
  }, [language, title]);

  useEffect(() => {
    void loadLanguageFont(language).catch((error: unknown) => {
      console.error('Unable to load the Amharic font.', error);
    });
  }, [language]);

  return children;
}
