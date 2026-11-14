import { screen, within } from '@testing-library/react';
import { renderRoute } from '../../../test/render';

vi.setConfig({ testTimeout: 30_000 });

describe('footer pages', () => {
  it.each([
    ['/about', 'About Midroc Learning'],
    ['/help', 'Help'],
    ['/privacy', 'Privacy notice'],
    ['/terms', 'Terms of use'],
  ])('%s opens without signing in', async (path, title) => {
    await renderRoute(path, { as: 'signedOut' });
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(2);
  });

  it('the privacy notice and the terms show when they last changed', async () => {
    await renderRoute('/privacy', { as: 'signedOut' });
    expect(await screen.findByText('Last updated Nov 14, 2026')).toBeVisible();
  });

  it('the footer links to all four pages and marks the open one', async () => {
    const { user } = await renderRoute('/about');
    await screen.findByRole('heading', { level: 1, name: 'About Midroc Learning' });
    const footerNav = within(screen.getByRole('contentinfo')).getByRole('navigation', {
      name: 'Site information',
    });
    const links = within(footerNav).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['About', '/about'],
      ['Help', '/help'],
      ['Privacy', '/privacy'],
      ['Terms', '/terms'],
    ]);
    expect(links[0]).toHaveAttribute('aria-current', 'page');

    await user.click(within(footerNav).getByRole('link', { name: 'Terms' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Terms of use' })).toBeVisible();
  });
});
