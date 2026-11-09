import { IconButton } from '@mui/material';
import { useLanguage } from './language-provider';

export function LanguageSwitcher() {
  const { language, messages, toggleLanguage } = useLanguage();

  return (
    <IconButton
      aria-label={`${messages.languageLabel}: ${language === 'en' ? messages.languageAmharic : messages.languageEnglish}`}
      onClick={toggleLanguage}
      sx={{ color: 'text.primary', fontSize: '0.875rem', fontWeight: 700 }}
    >
      {language === 'en' ? messages.switchToAmharic : messages.switchToEnglish}
    </IconButton>
  );
}
