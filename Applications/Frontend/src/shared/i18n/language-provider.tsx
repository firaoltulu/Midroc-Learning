import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';
import { messages, type Language, type Messages } from './messages';

interface LanguageContextValue {
  language: Language;
  messages: Messages;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): Language {
  return navigator.language.toLowerCase().startsWith('am') ? 'am' : 'en';
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const activeMessages = messages[language];
  const value = useMemo(
    () => ({
      language,
      messages: activeMessages,
      toggleLanguage: () => setLanguage((current) => (current === 'en' ? 'am' : 'en'))
    }),
    [activeMessages, language]
  );

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = activeMessages.title;
  }, [activeMessages.title, language]);

  useEffect(() => {
    if (language === 'am') {
      void Promise.all([
        import('@fontsource/noto-sans-ethiopic/400.css'),
        import('@fontsource/noto-sans-ethiopic/600.css')
      ]).catch((error: unknown) => {
        console.error('Unable to load the Amharic font.', error);
      });
    }
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider.');
  }

  return context;
}
