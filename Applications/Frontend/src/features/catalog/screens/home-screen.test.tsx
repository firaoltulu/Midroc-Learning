import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { courseDetailFixture, courseFixture, pageOf } from '../../../test/fixtures';
import { api, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';
import type { Enrollment } from '../../learning';
import { pickContinueCourse } from '../lib/continue-course';

vi.setConfig({ testTimeout: 30_000 });

const TITLE = 'Build skills that move your career forward';

const enrollment = (overrides: Partial<Enrollment> = {}): Enrollment => ({
  id: 'course-1',
  title: 'Workplace safety basics',
  description: '',
  category: 'Safety',
  language: 'en',
  thumbnailUrl: null,
  enrolledAt: '2026-11-01T08:00:00.000Z',
  progressPercent: 40,
  moduleCount: 3,
  currentModule: 2,
  lastActivityAt: '2026-11-10T08:00:00.000Z',
  ...overrides,
});

/** Serves the home page's data, recording each catalog request's query. */
function mockHome({
  enrollments = [enrollment()],
  categories = [
    { name: 'Business', courseCount: 24 },
    { name: 'Data', courseCount: 1 },
  ],
}: {
  enrollments?: Enrollment[];
  categories?: Array<{ name: string; courseCount: number }>;
} = {}) {
  const requests: Array<Record<string, string>> = [];
  server.use(
    http.get(api('/me/enrollments'), () => HttpResponse.json(enrollments)),
    http.get(api('/courses/categories'), () =>
      HttpResponse.json({ items: categories.map((category) => category.name), categories }),
    ),
    http.get(api('/courses/course-1'), () =>
      HttpResponse.json(
        // item-1 done: item-2 is where the learner picks up.
        courseDetailFixture({ enrolled: true, completedItemIds: ['item-1'] }),
      ),
    ),
    http.get(api('/courses'), ({ request }) => {
      const query = Object.fromEntries(new URL(request.url).searchParams);
      requests.push(query);
      const label = query.language === 'am' ? 'Amharic' : query.sort;
      return HttpResponse.json(
        pageOf(
          [
            courseFixture({ id: 'c1', title: `${label} course`, level: 'beginner' }),
            courseFixture({ id: 'c2', title: `${label} second`, level: null, language: 'am' }),
          ],
          { pageSize: 4 },
        ),
      );
    }),
  );
  return requests;
}

describe('home page', () => {
  it('shows the hero and the course to continue, with its module and a Resume link', async () => {
    mockHome({
      enrollments: [
        enrollment({
          id: 'course-9',
          title: 'Older course',
          lastActivityAt: '2026-10-01T08:00:00Z',
        }),
        enrollment(),
        enrollment({
          id: 'course-done',
          title: 'Finished',
          progressPercent: 100,
          currentModule: null,
        }),
      ],
    });
    await renderRoute('/');
    expect(await screen.findByRole('heading', { level: 1, name: TITLE })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Browse courses' })).toHaveAttribute(
      'href',
      '/courses',
    );

    const card = await screen.findByRole('region', { name: 'Workplace safety basics' });
    expect(within(card).getByText('Continue learning')).toBeVisible();
    expect(within(card).getByText('Module 2 of 3 · 40%')).toBeVisible();
    expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    await waitFor(() => {
      expect(within(card).getByRole('link', { name: 'Resume' })).toHaveAttribute(
        'href',
        '/learn/course-1/item-2',
      );
    });
  });

  it('leaves the card out when nothing is in progress', async () => {
    mockHome({ enrollments: [] });
    await renderRoute('/');
    await screen.findByRole('heading', { level: 1, name: TITLE });
    await screen.findByRole('heading', { level: 2, name: 'New and popular' });
    expect(await screen.findByRole('region', { name: 'What you get' })).toBeVisible();
    expect(screen.queryByText('Continue learning')).not.toBeInTheDocument();
  });

  it('"New and popular" switches between most popular, new and Amharic courses', async () => {
    const requests = mockHome();
    const { user } = await renderRoute('/');
    const section = await screen.findByRole('region', { name: 'New and popular' });
    expect(
      await within(section).findByRole('heading', { level: 3, name: 'popular course' }),
    ).toBeVisible();
    expect(requests.at(-1)).toEqual({ sort: 'popular', page: '1', pageSize: '4' });
    expect(within(section).getByRole('button', { name: 'Most popular' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Level and language as chips.
    const [card] = within(section).getAllByRole('article');
    if (!card) throw new Error('no course card');
    expect(within(card).getByText('Beginner')).toBeVisible();
    expect(within(card).getByText('English')).toBeVisible();
    expect(within(section).getByRole('link', { name: 'See all' })).toHaveAttribute(
      'href',
      '/courses?sort=popular',
    );

    await user.click(within(section).getByRole('button', { name: 'New' }));
    expect(
      await within(section).findByRole('heading', { level: 3, name: 'newest course' }),
    ).toBeVisible();
    expect(requests.at(-1)).toEqual({ sort: 'newest', page: '1', pageSize: '4' });

    await user.click(within(section).getByRole('button', { name: 'Amharic' }));
    expect(
      await within(section).findByRole('heading', { level: 3, name: 'Amharic course' }),
    ).toBeVisible();
    expect(requests.at(-1)).toEqual({ language: 'am', sort: 'popular', page: '1', pageSize: '4' });
  });

  it('lists the categories with their course counts, linking to the filtered catalog', async () => {
    mockHome();
    await renderRoute('/');
    const section = await screen.findByRole('region', { name: 'Explore categories' });
    const business = await within(section).findByRole('link', { name: 'Business' });
    expect(business).toHaveAttribute('href', '/courses?category=Business');
    expect(within(section).getByText('24 courses')).toBeVisible();
    expect(within(section).getByText('1 course')).toBeVisible();
  });

  it('has no category section when no course has a category', async () => {
    mockHome({ categories: [] });
    await renderRoute('/');
    await screen.findByRole('heading', { level: 2, name: 'New and popular' });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Explore categories' })).not.toBeInTheDocument();
    });
  });

  it('shows the platform FAQ after how it works', async () => {
    mockHome();
    await renderRoute('/');
    const howItWorks = await screen.findByRole('region', { name: 'How it works' });
    const faq = screen.getByRole('region', { name: 'Frequently asked questions' });

    expect(howItWorks.compareDocumentPosition(faq) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      within(faq).getByRole('button', { name: 'What languages are courses in?' }),
    ).toBeVisible();
  });
});

describe('pickContinueCourse', () => {
  it('takes the unfinished course with the latest activity', () => {
    const picked = pickContinueCourse([
      enrollment({ id: 'a', lastActivityAt: '2026-11-01T00:00:00Z' }),
      enrollment({ id: 'b', lastActivityAt: '2026-11-09T00:00:00Z' }),
      enrollment({
        id: 'done',
        progressPercent: 100,
        currentModule: null,
        lastActivityAt: '2026-11-12T00:00:00Z',
      }),
    ]);
    expect(picked?.id).toBe('b');
    expect(pickContinueCourse([])).toBeUndefined();
  });
});
