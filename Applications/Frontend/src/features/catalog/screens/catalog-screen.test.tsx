import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { courseFixture, pageOf } from '../../../test/fixtures';
import { api, apiError, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';

/** Serves the catalog, recording each request's query string. */
function mockCatalog(total = 30) {
  const requests: URLSearchParams[] = [];
  server.use(
    http.get(api('/courses'), ({ request }) => {
      const params = new URL(request.url).searchParams;
      requests.push(params);
      const page = Number(params.get('page') ?? '1');
      return HttpResponse.json(
        pageOf(
          [
            courseFixture({
              id: `course-${String(page)}`,
              title: `Course on page ${String(page)}`,
            }),
          ],
          {
            page,
            pageSize: 12,
            total,
          },
        ),
      );
    }),
    http.get(api('/courses/categories'), () =>
      HttpResponse.json({
        items: ['Leadership', 'Safety'],
        categories: [
          { name: 'Leadership', courseCount: 1 },
          { name: 'Safety', courseCount: 1 },
        ],
      }),
    ),
  );
  return requests;
}

const lastRequest = (requests: URLSearchParams[]) => Object.fromEntries(requests.at(-1) ?? []);

describe('catalog: filters live in the URL', () => {
  it('sorts by popularity from the URL and the "Sort by" menu; newest stays out of the URL', async () => {
    const requests = mockCatalog();
    const { router, user } = await renderRoute('/courses?sort=%22popular%22');
    await screen.findByRole('heading', { level: 2, name: 'Course on page 1' });
    expect(lastRequest(requests)).toMatchObject({ sort: 'popular' });

    await user.click(screen.getByRole('combobox', { name: 'Sort by' }));
    await user.click(screen.getByRole('option', { name: 'Newest' }));
    await waitFor(() => {
      expect(lastRequest(requests)).toMatchObject({ sort: 'newest' });
    });
    expect(router.state.location.search).toEqual({});
  });

  it('requests what the URL says', async () => {
    const requests = mockCatalog();
    await renderRoute('/courses?q=%22safety%22&language=%22am%22&category=%22Safety%22&page=2');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Course on page 2' }),
    ).toBeVisible();
    expect(lastRequest(requests)).toEqual({
      q: 'safety',
      language: 'am',
      category: 'Safety',
      sort: 'newest',
      page: '2',
      pageSize: '12',
    });
    expect(screen.getByRole('searchbox', { name: 'Search courses' })).toHaveValue('safety');
  });

  it('drops invalid values instead of failing', async () => {
    const requests = mockCatalog();
    const { router } = await renderRoute('/courses?language=%22fr%22&page=-3');
    expect(await screen.findByRole('heading', { level: 1, name: 'Courses' })).toBeVisible();
    await waitFor(() => {
      expect(lastRequest(requests)).toEqual({ sort: 'newest', page: '1', pageSize: '12' });
    });
    expect(router.state.location.search).toEqual({});
  });

  it('typing searches after a pause, replaces history and starts again at page 1', async () => {
    const requests = mockCatalog();
    const { router, user } = await renderRoute('/courses?page=3');
    await screen.findByRole('heading', { level: 2, name: 'Course on page 3' });
    const historyLength = router.history.length;

    await user.type(screen.getByRole('searchbox', { name: 'Search courses' }), 'first aid');
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ q: 'first aid' });
    });
    expect(router.history.length).toBe(historyLength);
    await waitFor(() => {
      expect(lastRequest(requests)).toMatchObject({ q: 'first aid', page: '1' });
    });
    // One request for the finished word, not one per keystroke.
    expect(requests.filter((params) => params.get('q')?.startsWith('first'))).toHaveLength(1);
  });

  it('choosing a language or category updates the URL', async () => {
    mockCatalog();
    const { router, user } = await renderRoute('/courses');
    await screen.findByRole('heading', { level: 2, name: 'Course on page 1' });

    await user.click(screen.getByRole('combobox', { name: 'Language' }));
    await user.click(screen.getByRole('option', { name: 'አማርኛ' }));
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ language: 'am' });
    });

    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    await user.click(screen.getByRole('option', { name: 'Leadership' }));
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ language: 'am', category: 'Leadership' });
    });

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => {
      expect(router.state.location.search).toEqual({});
    });
  });

  it('pages through results', async () => {
    mockCatalog(30);
    const { router, user } = await renderRoute('/courses');
    await screen.findByRole('heading', { level: 2, name: 'Course on page 1' });
    const pages = screen.getByRole('navigation', { name: 'Pages' });
    await user.click(within(pages).getByRole('button', { name: 'Go to page 3' }));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Course on page 3' }),
    ).toBeVisible();
    expect(router.state.location.search).toEqual({ page: 3 });
  });
});

describe('catalog: states', () => {
  it('cards link to the course', async () => {
    mockCatalog(1);
    await renderRoute('/courses');
    const link = await screen.findByRole('link', { name: 'Course on page 1' });
    expect(link).toHaveAttribute('href', '/courses/course-1');
    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();
  });

  it('no results for the filters offers to clear them', async () => {
    server.use(
      http.get(api('/courses'), () => HttpResponse.json(pageOf([]))),
      http.get(api('/courses/categories'), () => HttpResponse.json({ items: [], categories: [] })),
    );
    const { router, user } = await renderRoute('/courses?q=%22zzz%22');
    expect(await screen.findByRole('heading', { name: 'No courses match' })).toBeVisible();
    // The empty state's button (the filter bar has one too).
    const clearButtons = screen.getAllByRole('button', { name: 'Clear filters' });
    await user.click(clearButtons[clearButtons.length - 1] as HTMLElement);
    await waitFor(() => {
      expect(router.state.location.search).toEqual({});
    });
    expect(await screen.findByRole('heading', { name: 'No courses yet' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Create a course' })).toHaveAttribute(
      'href',
      '/my-courses/new',
    );
  });

  it('a failure shows a translated error with a retry', async () => {
    server.use(
      http.get(api('/courses'), () => apiError(500, { code: 'INTERNAL_ERROR' })),
      http.get(api('/courses/categories'), () => HttpResponse.json({ items: [], categories: [] })),
    );
    await renderRoute('/courses');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong on our side. Try again in a moment.',
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
