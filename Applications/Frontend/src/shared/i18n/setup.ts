import { createInstance } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { loadFontsForLanguage } from '../theme/fonts';
import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES, toLanguage, type Language } from './languages';
import { defaultNS, resources } from './resources';

type Bundle = Record<string, unknown>;

/**
 * The app's own i18next instance (react-i18next picks it up through initReactI18next).
 * Owning it, rather than the library's global default, keeps setup testable in isolation.
 */
const i18n = createInstance();

/** Amharic namespaces are fetched on demand, so English-only visitors never download them. */
const lazyBundles: Record<Exclude<Language, 'en'>, Record<string, () => Promise<Bundle>>> = {
  am: import.meta.glob<Bundle>('../../locales/am/*.json', { import: 'default' }),
};

const loadedLanguages = new Set<Language>(['en']);

async function ensureResources(language: Language): Promise<void> {
  if (language === 'en' || loadedLanguages.has(language)) return;
  await Promise.all(
    Object.entries(lazyBundles[language]).map(async ([path, load]) => {
      const ns = /([^/]+)\.json$/.exec(path)?.[1];
      if (ns) i18n.addResourceBundle(language, ns, await load(), true, true);
    }),
  );
  loadedLanguages.add(language);
}

function applyToDocument(language: Language) {
  document.documentElement.lang = language;
  document.title = i18n.t('appName', { ns: 'common', lng: language });
}

/**
 * Initializes i18next. Detection order: saved choice (localStorage) -> browser language
 * (`am*` -> Amharic) -> English. Only an explicit choice is saved (see setLanguage).
 * Resolves once the detected language's resources (and, for Amharic, its font) are requested.
 */
export async function initI18n(options: { lng?: Language } = {}) {
  if (!i18n.isInitialized) {
    i18n.on('languageChanged', (tag) => {
      const language = toLanguage(tag);
      applyToDocument(language);
      void loadFontsForLanguage(language);
    });

    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        ...(options.lng ? { lng: options.lng } : {}),
        resources,
        partialBundledLanguages: true,
        supportedLngs: [...SUPPORTED_LANGUAGES],
        nonExplicitSupportedLngs: true,
        load: 'languageOnly',
        fallbackLng: 'en',
        ns: Object.keys(resources.en),
        defaultNS,
        interpolation: { escapeValue: false }, // React already escapes
        detection: {
          order: ['localStorage', 'navigator'],
          lookupLocalStorage: LANGUAGE_STORAGE_KEY,
          caches: [],
        },
        react: { useSuspense: false },
      });
  }

  // `language` is what the detector chose; `resolvedLanguage` would still say English here
  // because Amharic resources are loaded lazily, just below.
  const language = toLanguage(options.lng ?? i18n.language);
  await ensureResources(language);
  await i18n.changeLanguage(language);
  return i18n;
}

/** Switches the interface language and remembers the choice. */
export async function setLanguage(language: Language): Promise<void> {
  await ensureResources(language);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage blocked (private mode): the choice lasts for this session only.
  }
  await i18n.changeLanguage(language);
}

export { i18n };
