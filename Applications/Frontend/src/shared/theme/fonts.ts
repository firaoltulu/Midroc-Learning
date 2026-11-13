// Inter (variable) is always used; its @font-face rules carry unicode ranges, so browsers
// download only the subsets a page needs.
import '@fontsource-variable/inter';

/**
 * Noto Sans Ethiopic is loaded only when the interface is Amharic: dynamic imports of the
 * Ethiopic subset at the three weights the UI uses (400/500/600, `font-display: swap`).
 * The theme's font stack falls back to it per glyph after Inter.
 */
const loadEthiopicFaces = () =>
  Promise.all([
    import('@fontsource/noto-sans-ethiopic/ethiopic-400.css'),
    import('@fontsource/noto-sans-ethiopic/ethiopic-500.css'),
    import('@fontsource/noto-sans-ethiopic/ethiopic-600.css'),
  ]);

let ethiopic: Promise<void> | undefined;

export function loadFontsForLanguage(language: string): Promise<void> {
  if (language !== 'am') return Promise.resolve();
  ethiopic ??= loadEthiopicFaces().then(
    () => undefined,
    () => {
      // Offline or blocked: system fonts render Ethiopic meanwhile; retry on the next switch.
      ethiopic = undefined;
    },
  );
  return ethiopic;
}
