import { fireEvent, render, screen } from '@testing-library/react';
import { AppThemeProvider } from '../theme/theme-provider';
import { CourseThumbnail } from './course-thumbnail';

const renderThumbnail = (src: string | null) =>
  render(
    <AppThemeProvider>
      <CourseThumbnail src={src} />
    </AppThemeProvider>,
  );

const image = (container: HTMLElement) => container.querySelector('img:not([data-variant])');
const fallback = (container: HTMLElement) => container.querySelector('[data-fallback]');

describe('CourseThumbnail', () => {
  it('shows an http(s) image lazily, as decoration', () => {
    const { container } = renderThumbnail('https://cdn.example.com/a.jpg');
    expect(image(container)).toHaveAttribute('loading', 'lazy');
    expect(image(container)).toHaveAttribute('alt', '');
    expect(fallback(container)).toBeNull();
  });

  it.each([null, 'javascript:alert(1)', 'data:image/png;base64,AAA', 'not a url'])(
    'shows the branded fallback for %s',
    (src) => {
      const { container } = renderThumbnail(src);
      expect(image(container)).toBeNull();
      expect(fallback(container)).not.toBeNull();
    },
  );

  it('falls back when the image fails to load', () => {
    const { container } = renderThumbnail('https://cdn.example.com/missing.jpg');
    const img = image(container);
    if (!img) throw new Error('expected the image to render first');
    fireEvent.error(img);
    expect(image(container)).toBeNull();
    expect(fallback(container)).not.toBeNull();
    expect(screen.queryByRole('img', { name: /./ })).toBeNull();
  });
});
