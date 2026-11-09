import type { AppLanguage } from './i18n';

type AmharicFontLoader = () => Promise<unknown>;

const loadAmharicFont: AmharicFontLoader = () =>
  Promise.all([
    import('@fontsource/noto-sans-ethiopic/400.css'),
    import('@fontsource/noto-sans-ethiopic/600.css')
  ]);

export async function loadLanguageFont(
  language: AppLanguage,
  loadFont: AmharicFontLoader = loadAmharicFont
): Promise<void> {
  if (language === 'am') {
    await loadFont();
  }
}
