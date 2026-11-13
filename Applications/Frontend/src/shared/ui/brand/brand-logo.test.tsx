import { render, screen, waitFor } from '@testing-library/react';
import { AppThemeProvider, COLOR_MODE_STORAGE_KEY } from '../../theme/theme-provider';
import { brandAssets } from './brand-assets';
import { BrandLogo } from './brand-logo';

function renderLogo(mode: 'system' | 'light' | 'dark', props = {}) {
  localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  return render(
    <AppThemeProvider>
      <BrandLogo {...props} />
    </AppThemeProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  window.__prefersDark = false;
});

describe('BrandLogo', () => {
  it.each([
    ['light', false, 'light'],
    ['dark', false, 'dark'],
    ['system', false, 'light'],
    ['system', true, 'dark'],
  ] as const)(
    'mode %s with system dark=%s uses the %s artwork',
    async (mode, prefersDark, expected) => {
      window.__prefersDark = prefersDark;
      renderLogo(mode);
      const img = screen.getByRole('img', { name: 'Midroc Investment Group' });
      await waitFor(() => {
        expect(img).toHaveAttribute('data-scheme', expected);
      });
      expect(img).toHaveAttribute('src', brandAssets.full[expected].src);
    },
  );

  it('renders the mark with a size that keeps its aspect ratio', () => {
    renderLogo('light', { variant: 'mark', height: 47 });
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', brandAssets.mark.light.src);
    expect(img).toHaveAttribute('height', '47');
    expect(img).toHaveAttribute('width', '89');
  });

  it('is hidden from assistive technology when decorative', () => {
    const { container } = renderLogo('light', { decorative: true });
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });
});
