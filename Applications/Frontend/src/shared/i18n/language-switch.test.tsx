import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageSwitcher } from '../ui/language-switcher';
import { LANGUAGE_STORAGE_KEY } from './languages';
import { i18n, setLanguage } from './setup';

// Record when the Ethiopic font files are fetched. vi.mock factories run on first import,
// i.e. only when fonts.ts actually performs the dynamic import.
const fontLoads = vi.hoisted(() => [] as string[]);
vi.mock('@fontsource/noto-sans-ethiopic/ethiopic-400.css', () => {
  fontLoads.push('400');
  return {};
});
vi.mock('@fontsource/noto-sans-ethiopic/ethiopic-500.css', () => {
  fontLoads.push('500');
  return {};
});
vi.mock('@fontsource/noto-sans-ethiopic/ethiopic-600.css', () => {
  fontLoads.push('600');
  return {};
});

afterAll(async () => {
  localStorage.clear();
  await setLanguage('en');
});

// These tests run in order: English first (no Ethiopic font), then the switch to Amharic.
describe('language switching', () => {
  it('starts in English with lang="en", an English title and no Ethiopic font', async () => {
    await setLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('Midroc Learning');
    expect(fontLoads).toEqual([]);
  });

  it('switching to Amharic updates <html lang>, the title, the strings and saves the choice', async () => {
    await setLanguage('am');
    expect(document.documentElement.lang).toBe('am');
    expect(document.title).toBe('ሚድሮክ ትምህርት');
    expect(i18n.t('status.published', { ns: 'common' })).toBe('የታተመ');
    expect(i18n.t('title', { ns: 'design' })).toBe('የዲዛይን ሥርዓት');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('am');
  });

  it('loads the Ethiopic font (400/500/600) once Amharic is selected, and only once', async () => {
    await waitFor(() => {
      expect([...fontLoads].sort()).toEqual(['400', '500', '600']);
    });
    await setLanguage('en');
    await setLanguage('am');
    expect(fontLoads).toHaveLength(3);
  });

  it('the header switcher changes the language and names each language in itself', async () => {
    await setLanguage('en');
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Language: English' }));
    const amharic = screen.getByRole('menuitemradio', { name: 'አማርኛ' });
    expect(amharic.querySelector('[lang="am"]')).not.toBeNull();
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await user.click(amharic);
    await waitFor(() => {
      expect(document.documentElement.lang).toBe('am');
    });
    expect(await screen.findByRole('button', { name: 'ቋንቋ፦ አማርኛ' })).toBeInTheDocument();
  });
});
