import { screen, waitFor } from '@testing-library/react';
import { CALENDAR_STORAGE_KEY } from '../../../shared/i18n/use-date-format';
import { setLanguage } from '../../../shared/i18n/setup';
import { renderWithProviders } from '../../../test/render';
import { AccountScreen } from './account-screen';

// The Ethiopic font is loaded for Amharic; not needed here.
vi.mock('@fontsource/noto-sans-ethiopic/ethiopic-400.css', () => ({}));
vi.mock('@fontsource/noto-sans-ethiopic/ethiopic-500.css', () => ({}));
vi.mock('@fontsource/noto-sans-ethiopic/ethiopic-600.css', () => ({}));

afterEach(async () => {
  localStorage.clear();
  await setLanguage('en');
});

describe('account settings', () => {
  it('shows the profile', async () => {
    await renderWithProviders(<AccountScreen />);
    expect(await screen.findByText('learner@example.com')).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();
  });

  it('the date format applies at once and is remembered', async () => {
    const { user } = await renderWithProviders(<AccountScreen />);
    const group = screen.getByRole('radiogroup', { name: 'Date format' });
    expect(screen.getByRole('radio', { name: 'Follow the language' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Gregorian' }));
    expect(screen.getByRole('radio', { name: 'Gregorian' })).toBeChecked();
    expect(localStorage.getItem(CALENDAR_STORAGE_KEY)).toBe('gregorian');
    expect(group).toHaveAccessibleDescription(/Today|Ethiopian/);
  });

  it('the theme setting offers device, light and dark', async () => {
    const { user } = await renderWithProviders(<AccountScreen />);
    expect(screen.getByRole('radio', { name: 'Match device' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });

  it('switching the language to Amharic updates the page language', async () => {
    const { user } = await renderWithProviders(<AccountScreen />);
    await user.click(screen.getByRole('radio', { name: 'አማርኛ' }));
    await waitFor(() => {
      expect(document.documentElement.lang).toBe('am');
    });
    expect(await screen.findByRole('radio', { name: 'አማርኛ' })).toBeChecked();
  });
});
