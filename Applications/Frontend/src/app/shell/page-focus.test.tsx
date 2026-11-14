import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { pageOf } from '../../test/fixtures';
import { api, server } from '../../test/msw';
import { renderRoute } from '../../test/render';

vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => {
  server.use(
    http.get(api('/courses'), () => HttpResponse.json({ ...pageOf([]), pageSize: 12 })),
    http.get(api('/courses/categories'), () => HttpResponse.json({ items: [], categories: [] })),
  );
});

describe('page title and focus on navigation', () => {
  it('the title follows the page heading', async () => {
    await renderRoute('/account');
    await screen.findByRole('heading', { level: 1, name: 'Account' });
    await waitFor(() => {
      expect(document.title).toBe('Account – Midroc Learning');
    });
  });

  it('moving to another page focuses its heading; a filter change keeps focus', async () => {
    const { user } = await renderRoute('/account');
    await screen.findByRole('heading', { level: 1, name: 'Account' });

    await user.click(
      screen
        .getByRole('navigation', { name: 'Main navigation' })
        .querySelector('a[href="/courses"]') as HTMLElement,
    );
    const heading = await screen.findByRole('heading', { level: 1, name: 'Courses' });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(document.title).toBe('Courses – Midroc Learning');

    // Typing a search changes only the search params: focus stays in the field.
    const search = screen.getByRole('searchbox', { name: 'Search courses' });
    await user.type(search, 'fire');
    await waitFor(() => {
      expect(search).toHaveValue('fire');
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(search).toHaveFocus();
  });
});
