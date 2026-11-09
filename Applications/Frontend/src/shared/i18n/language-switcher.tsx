import { IconButton } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { AppLanguage } from './i18n';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const language: AppLanguage = i18n.resolvedLanguage?.startsWith('am') ? 'am' : 'en';
  const nextLanguage: AppLanguage = language === 'en' ? 'am' : 'en';
  const languageName = language === 'en' ? t('languageAmharic') : t('languageEnglish');
  const switchLabel = language === 'en' ? t('switchToAmharic') : t('switchToEnglish');

  return (
    <IconButton
      aria-label={`${t('languageLabel')}: ${languageName}`}
      onClick={() => void i18n.changeLanguage(nextLanguage)}
      sx={{ color: 'text.primary', fontSize: '0.875rem', fontWeight: 700 }}
    >
      {switchLabel}
    </IconButton>
  );
}
