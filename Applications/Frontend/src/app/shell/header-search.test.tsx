import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { pageOf } from '../../test/fixtures';
import { api, server } from '../../test/msw';
import { renderRoute } from '../../test/render';

vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => {
  server.use(
    http.get(api('/courses'), () => HttpResponse.json({ ...pageOf([]), pageSize: 12 })),
    http.get(api('/courses/categories'), () => HttpResponse.json({ items: [] })),
  );
});

describe('header', () => {
  it('searching opens the catalog with the query, and the box shows it there', async () => {
    const { user, router } = await renderRoute('/account');
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    const box = within(nav).getByRole('searchbox', { name: 'Find a course' });
    await user.type(box, '  farm accounting {Enter}');

    await screen.findByRole('heading', { level: 1, name: 'Courses' });
    expect(router.state.location.pathname).toBe('/courses');
    expect(router.state.location.search).toEqual({ q: 'farm accounting' });
    expect(within(nav).getByRole('searchbox', { name: 'Find a course' })).toHaveValue(
      'farm accounting',
    );
  });

  it('shows Explore and the learner links, and the avatar has two initials', async () => {
    await renderRoute('/account');
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/courses');
    expect(within(nav).getByRole('link', { name: 'My learning' })).toBeVisible();
    expect(within(nav).getByRole('link', { name: 'My courses' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Account menu for Abebe Kebede' })).toHaveTextContent(
      'AK',
    );
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Midroc Investment Group');
  });
});
