import { describe, expect, it, vi } from 'vitest';
import { loadLanguageFont } from '../shared/i18n/font-loader';

describe('language font loading', () => {
  it('loads the Ethiopic font only for Amharic', async () => {
    const loadFont = vi.fn(async () => undefined);

    await loadLanguageFont('en', loadFont);
    expect(loadFont).not.toHaveBeenCalled();

    await loadLanguageFont('am', loadFont);
    expect(loadFont).toHaveBeenCalledOnce();
  });
});
