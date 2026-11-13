import { LANGUAGE_STORAGE_KEY } from './languages';

/**
 * Detection order: saved choice -> browser language (am* -> Amharic) -> English.
 * Each case loads a fresh i18next instance (vi.resetModules) without a forced language.
 */
async function detect(options: { saved?: string; browser: string[] }) {
  localStorage.clear();
  if (options.saved) localStorage.setItem(LANGUAGE_STORAGE_KEY, options.saved);
  Object.defineProperty(navigator, 'languages', { value: options.browser, configurable: true });
  Object.defineProperty(navigator, 'language', { value: options.browser[0], configurable: true });

  vi.resetModules();
  const { initI18n } = await import('./setup');
  const i18n = await initI18n();
  return { language: i18n.resolvedLanguage, lang: document.documentElement.lang };
}

afterAll(() => {
  localStorage.clear();
});

describe('language detection', () => {
  it('uses the saved choice first', async () => {
    expect(await detect({ saved: 'en', browser: ['am-ET'] })).toEqual({
      language: 'en',
      lang: 'en',
    });
    expect(await detect({ saved: 'am', browser: ['en-US'] })).toEqual({
      language: 'am',
      lang: 'am',
    });
  });

  it('then the browser language, treating any am* tag as Amharic', async () => {
    expect(await detect({ browser: ['am-ET', 'en'] })).toEqual({ language: 'am', lang: 'am' });
    expect(await detect({ browser: ['fr-FR', 'am'] })).toEqual({ language: 'am', lang: 'am' });
  });

  it('falls back to English', async () => {
    expect(await detect({ browser: ['fr-FR', 'de'] })).toEqual({ language: 'en', lang: 'en' });
  });

  it('ignores an invalid saved value', async () => {
    expect(await detect({ saved: 'xx', browser: ['en-GB'] })).toEqual({
      language: 'en',
      lang: 'en',
    });
  });
});
