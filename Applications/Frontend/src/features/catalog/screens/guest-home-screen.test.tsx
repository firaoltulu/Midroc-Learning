import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expectNoAxeViolations } from '../../../test/axe';
import { courseFixture, pageOf } from '../../../test/fixtures';
import { api, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';

vi.setConfig({ testTimeout: 30_000 });

const TITLE = 'Learn practical skills, in English and Amharic';

/** A public course: no owner id, no `enrolled`, the instructor's short name. */
const publicCourse = (overrides: Record<string, unknown> = {}) => {
  const course: Record<string, unknown> = {
    ...courseFixture({ ownerName: 'Almaz B.', ...overrides }),
  };
  delete course.ownerId;
  delete course.enrolled;
  delete course.status;
  return course;
};

/** Serves the public catalog; records each request's query and whether it was signed. */
function mockPublic() {
  const requests: Array<{ query: Record<string, string>; signed: boolean }> = [];
  let signedIn = 0;
  server.use(
    http.get(api('/public/courses'), ({ request }) => {
      const query = Object.fromEntries(new URL(request.url).searchParams);
      requests.push({ query, signed: request.headers.has('authorization') });
      return HttpResponse.json(
        pageOf([publicCourse({ id: 'c1', title: `${query.language ?? query.sort} course` })], {
          pageSize: 4,
        }),
      );
    }),
    http.get(api('/public/courses/categories'), () =>
      HttpResponse.json({ items: ['Safety'], categories: [{ name: 'Safety', courseCount: 3 }] }),
    ),
    // The signed-in catalog must not be asked.
    http.get(api('/courses'), () => {
      signedIn += 1;
      return HttpResponse.json(pageOf([]));
    }),
    http.get(api('/courses/categories'), () => {
      signedIn += 1;
      return HttpResponse.json({ items: [], categories: [] });
    }),
  );
  return { requests, signedInCalls: () => signedIn };
}

describe('guest home page', () => {
  it('signed-out visitors to / land on it, with Join for free and Sign in', async () => {
    mockPublic();
    const { router } = await renderRoute('/', { as: 'signedOut' });
    expect(await screen.findByRole('heading', { level: 1, name: TITLE })).toBeVisible();
    expect(router.state.location.pathname).toBe('/welcome');

    const hero = screen.getByRole('heading', { level: 1 }).closest('section, div') as HTMLElement;
    expect(within(hero).getByRole('link', { name: 'Join for free' })).toHaveAttribute(
      'href',
      '/signup',
    );
    // The header has its own Sign in and Join for free.
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(within(header).getByRole('link', { name: 'Join for free' })).toHaveAttribute(
      'href',
      '/signup',
    );
    expect(screen.getByRole('region', { name: 'What you get' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'How it works' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Share what you know' })).toBeVisible();
  });

  it('shows real courses and categories from the public catalog, without a token', async () => {
    const { requests, signedInCalls } = mockPublic();
    const { user } = await renderRoute('/welcome', { as: 'signedOut' });
    const shelf = await screen.findByRole('region', { name: 'New and popular' });
    const card = await within(shelf).findByRole('article');
    expect(within(card).getByRole('heading', { level: 3, name: 'popular course' })).toBeVisible();
    expect(within(card).getByText('By Almaz B.')).toBeVisible();
    // The course link leads to sign-in first (the course page needs an account).
    expect(within(card).getByRole('link', { name: 'popular course' })).toHaveAttribute(
      'href',
      '/courses/c1',
    );
    expect(requests.at(-1)).toEqual({
      query: { sort: 'popular', page: '1', pageSize: '4' },
      signed: false,
    });

    await user.click(within(shelf).getByRole('button', { name: 'Amharic' }));
    expect(await within(shelf).findByRole('heading', { name: 'am course' })).toBeVisible();

    const categories = await screen.findByRole('region', { name: 'Explore categories' });
    expect(await within(categories).findByRole('link', { name: 'Safety' })).toBeVisible();
    expect(within(categories).getByText('3 courses')).toBeVisible();
    expect(signedInCalls()).toBe(0);
  });

  it('sends signed-in users home', async () => {
    server.use(
      http.get(api('/me/enrollments'), () => HttpResponse.json([])),
      http.get(api('/courses'), () => HttpResponse.json(pageOf([]))),
      http.get(api('/courses/categories'), () => HttpResponse.json({ items: [], categories: [] })),
    );
    const { router } = await renderRoute('/welcome');
    await screen.findByRole('heading', {
      level: 1,
      name: 'Build skills that move your career forward',
    });
    expect(router.state.location.pathname).toBe('/');
  });

  it('is accessible', async () => {
    mockPublic();
    await renderRoute('/welcome', { as: 'signedOut' });
    await screen.findByRole('heading', { level: 3, name: 'popular course' });
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Safety' })).toBeVisible();
    });
    await expectNoAxeViolations();
  });
});
