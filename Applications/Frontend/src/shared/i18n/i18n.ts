import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import amCommon from '../../locales/am/common.json';
import amDesign from '../../locales/am/design.json';
import amAuth from '../../locales/am/auth.json';
import amHome from '../../locales/am/home.json';
import enCommon from '../../locales/en/common.json';
import enDesign from '../../locales/en/design.json';
import enAuth from '../../locales/en/auth.json';
import enHome from '../../locales/en/home.json';

export const resources = {
  en: { common: enCommon, home: enHome, design: enDesign, auth: enAuth },
  am: { common: amCommon, home: amHome, design: amDesign, auth: amAuth }
} as const;

export type AppLanguage = keyof typeof resources;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['en'];
    returnNull: false;
  }
}

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'am'],
    load: 'languageOnly',
    ns: ['common', 'home', 'design', 'auth'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnNull: false,
    initAsync: false,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'midroc-language',
      caches: ['localStorage']
    }
  });

export default i18next;
