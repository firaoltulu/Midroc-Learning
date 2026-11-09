import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from '../features/home';
import { LanguageSwitcher } from '../shared/i18n/language-switcher';
import { LanguageProvider } from '../shared/i18n/language-provider';

function renderHome() {
  return render(
    <LanguageProvider>
      <LanguageSwitcher />
      <HomePage />
    </LanguageProvider>
  );
}

describe('home page', () => {
  it('renders the learning welcome content', () => {
    renderHome();

    expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    expect(screen.getByText('Your learning space')).toBeVisible();
  });

  it('switches the visible content language', () => {
    renderHome();

    fireEvent.click(screen.getByRole('button', { name: 'Language: Amharic' }));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'ወደፊት ሊሆኑ ለሚችሉት ነገሮች ቦታ ይፍጠሩ።'
    );
    expect(document.documentElement).toHaveAttribute('lang', 'am');
  });
});
