import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { courseFixture, pageOf } from '../../test/fixtures';
import { api, apiError, server } from '../../test/msw';
import { renderRoute } from '../../test/render';

vi.setConfig({ testTimeout: 30_000 });

// Charts need a real layout engine; their numbers are also on the page as text.
vi.mock('./dashboard/components/enrollment-chart', () => ({ default: () => null }));
vi.mock('./courses/components/progress-chart', () => ({ default: () => null }));

const overview = {
  userCount: 42,
  courseCount: 9,
  publishedCourseCount: 5,
  enrollmentCount: 120,
  submittedAttemptCount: 30,
  averageExamScore: 71.5,
  examPassRate: 62.5,
  enrollmentsLast30Days: 18,
  activeLearnerCount: 11,
  pendingRevisionCount: 2,
  coursesByStatus: { draft: 2, pending_review: 1, published: 5, rejected: 1, archived: 0 },
};

function mockDashboard() {
  const seriesQueries: Record<string, string>[] = [];
  server.use(
    http.get(api('/admin/analytics/overview'), () => HttpResponse.json(overview)),
    http.get(api('/admin/analytics/enrollments'), ({ request }) => {
      seriesQueries.push(Object.fromEntries(new URL(request.url).searchParams));
      return HttpResponse.json([
        { date: '2026-11-13T00:00:00Z', count: 2 },
        { date: '2026-11-14T00:00:00Z', count: 3 },
      ]);
    }),
    http.get(api('/admin/analytics/courses'), () =>
      HttpResponse.json([
        {
          id: 'course-1',
          title: 'Workplace safety basics',
          status: 'published',
          enrollmentCount: 12,
          completedCount: 3,
          completionRate: 25,
        },
      ]),
    ),
  );
  return seriesQueries;
}

describe('admin guard', () => {
  it('a learner sees the not-allowed screen, not the dashboard', async () => {
    mockDashboard();
    await renderRoute('/admin', { as: 'user' });
    expect(
      await screen.findByRole('heading', { name: "You don't have access to this page" }),
    ).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Administration' })).not.toBeInTheDocument();
  });

  it('an administrator gets the admin area with its section navigation', async () => {
    mockDashboard();
    await renderRoute('/admin', { as: 'admin' });
    const nav = await screen.findByRole('navigation', { name: 'Administration' });
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Users' })).toHaveAttribute(
      'href',
      '/admin/users',
    );
  });
});

describe('dashboard', () => {
  it('shows the metric cards, the series as numbers, and the top courses', async () => {
    mockDashboard();
    await renderRoute('/admin', { as: 'admin' });
    const metrics = await screen.findByRole('list', { name: 'Key figures' });
    expect(within(metrics).getByText('Active learners').closest('li')).toHaveTextContent('11');
    expect(within(metrics).getByText('Exam pass rate').closest('li')).toHaveTextContent('62.5%');
    expect(within(metrics).getByText('Waiting for review').closest('li')).toHaveTextContent(
      '1 courses, 2 changes',
    );
    expect(await screen.findByText(/^5 enrollments from/)).toBeVisible();
    const top = screen.getByRole('table', { name: 'Courses with the most learners' });
    expect(within(top).getByRole('link', { name: 'Workplace safety basics' })).toHaveAttribute(
      'href',
      '/admin/courses/course-1',
    );
    expect(within(top).getByText('25%')).toBeVisible();
  });

  it('the period and grouping live in the URL', async () => {
    const queries = mockDashboard();
    const { user, router } = await renderRoute('/admin', { as: 'admin' });
    await screen.findByText(/enrollments from/);
    expect(queries.at(-1)?.interval).toBe('day');

    await user.click(screen.getByRole('combobox', { name: 'Period' }));
    await user.click(await screen.findByRole('option', { name: 'Last 12 months' }));
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ range: '12m' });
    });
    await waitFor(() => {
      expect(queries.at(-1)?.interval).toBe('month');
    });

    await user.click(screen.getByRole('combobox', { name: 'Group by' }));
    await user.click(await screen.findByRole('option', { name: 'Week' }));
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ range: '12m', interval: 'week' });
    });
  });
});

describe('admin courses', () => {
  const adminCourse = (overrides: Record<string, unknown> = {}) => ({
    ...courseFixture(overrides),
    ownerName: 'Abebe Kebede',
    ownerEmail: 'abebe@example.com',
    updatedAt: '2026-11-10T09:00:00.000Z',
    enrollmentCount: 12,
  });

  it('filters by status through the URL', async () => {
    const queries: Record<string, string>[] = [];
    server.use(
      http.get(api('/admin/courses'), ({ request }) => {
        queries.push(Object.fromEntries(new URL(request.url).searchParams));
        return HttpResponse.json(pageOf([adminCourse()]));
      }),
    );
    const { user, router } = await renderRoute('/admin/courses', { as: 'admin' });
    const table = await screen.findByRole('table', { name: 'Courses' });
    expect(within(table).getByText('abebe@example.com')).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(await screen.findByRole('option', { name: 'Published' }));
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ status: 'published' });
    });
    await waitFor(() => {
      expect(queries.at(-1)).toEqual({ status: 'published', page: '1', pageSize: '20' });
    });
  });

  function mockCourse() {
    const removed: string[] = [];
    server.use(
      http.get(api('/admin/analytics/courses/course-1'), () =>
        HttpResponse.json({
          id: 'course-1',
          title: 'Workplace safety basics',
          status: 'published',
          enrollmentCount: 2,
          itemCount: 2,
          completedItemCount: 2,
          submittedAttemptCount: 2,
          averageExamScore: 65,
          examPassRate: 50,
          completedEnrollmentCount: 1,
          completionRate: 50,
          progressDistribution: [
            { min: 0, max: 0, count: 0 },
            { min: 1, max: 24, count: 0 },
            { min: 25, max: 49, count: 0 },
            { min: 50, max: 74, count: 1 },
            { min: 75, max: 99, count: 0 },
            { min: 100, max: 100, count: 1 },
          ],
          items: [
            {
              id: 'item-1',
              type: 'pdf',
              title: 'Handbook',
              moduleId: 'module-1',
              moduleTitle: 'Basics',
              completedCount: 2,
              submittedAttemptCount: null,
              passRate: null,
              averageScore: null,
            },
            {
              id: 'item-2',
              type: 'exam',
              title: 'Quiz',
              moduleId: 'module-1',
              moduleTitle: 'Basics',
              completedCount: 1,
              submittedAttemptCount: 2,
              passRate: 50,
              averageScore: 65,
            },
          ],
        }),
      ),
      http.get(api('/admin/courses/course-1/enrollments'), () =>
        HttpResponse.json(
          pageOf(
            removed.length
              ? []
              : [
                  {
                    userId: 'user-2',
                    email: 'sara@example.com',
                    name: 'Sara Tesfaye',
                    enrolledAt: '2026-11-01T09:00:00.000Z',
                    itemCount: 2,
                    completedItemCount: 1,
                    progressPercent: 50,
                    lastActivityAt: null,
                  },
                ],
          ),
        ),
      ),
      http.delete(api('/admin/courses/course-1/enrollments/:userId'), ({ params }) => {
        removed.push(String(params.userId));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    return removed;
  }

  it('shows analytics and removes an enrollment after a confirmation', async () => {
    const removed = mockCourse();
    const { user } = await renderRoute('/admin/courses/course-1', { as: 'admin' });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Workplace safety basics' }),
    ).toBeVisible();
    expect(screen.getByText('50–74%: 1 learner')).toBeInTheDocument();
    const items = screen.getByRole('table', { name: 'Items' });
    expect(within(items).getByRole('rowheader', { name: /Quiz/ })).toBeVisible();
    const handbook = within(items)
      .getByRole('rowheader', { name: /Handbook/ })
      .closest('tr');
    expect(handbook).toHaveTextContent('2 (100%)');
    expect(within(handbook as HTMLElement).getAllByText('Not an exam')).toHaveLength(2);

    const enrollments = await screen.findByRole('table', { name: 'Enrollments' });
    await user.click(
      within(enrollments).getByRole('button', { name: 'Remove from course: Sara Tesfaye' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Remove Sara Tesfaye from this course?',
    });
    expect(dialog).toHaveTextContent('progress and exam attempts are kept');
    await user.click(within(dialog).getByRole('button', { name: 'Remove from course' }));
    await waitFor(() => {
      expect(removed).toEqual(['user-2']);
    });
    expect(await screen.findByRole('heading', { name: 'No one is enrolled' })).toBeVisible();
  });
});

describe('videos', () => {
  it('lists unavailable videos and runs a check', async () => {
    server.use(
      http.get(api('/admin/videos/unavailable'), () =>
        HttpResponse.json([
          {
            itemId: 'item-1',
            itemTitle: 'Welcome',
            youtubeTitle: 'Welcome to safety',
            lastCheckedAt: '2026-11-13T09:00:00.000Z',
            courseId: 'course-1',
            courseTitle: 'Workplace safety basics',
            ownerId: 'owner-1',
            ownerName: 'Abebe Kebede',
            ownerEmail: 'abebe@example.com',
          },
        ]),
      ),
      http.post(api('/admin/jobs/youtube-check'), () =>
        HttpResponse.json({
          checked: 10,
          available: 8,
          newlyUnavailable: 1,
          recovered: 0,
          stillUnavailable: 1,
          unreachable: 0,
          aborted: false,
          skipped: false,
        }),
      ),
    );
    const { user } = await renderRoute('/admin/videos', { as: 'admin' });
    const table = await screen.findByRole('table', { name: 'Unavailable videos' });
    expect(within(table).getByText('Abebe Kebede')).toBeInTheDocument();
    expect(within(table).getByText('On YouTube: Welcome to safety')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Run check now' }));
    expect(await screen.findByText('Check finished')).toBeVisible();
    expect(screen.getByText('Newly unavailable').nextElementSibling).toHaveTextContent('1');
  });

  it('says when a check is already running', async () => {
    server.use(
      http.get(api('/admin/videos/unavailable'), () => HttpResponse.json([])),
      http.post(api('/admin/jobs/youtube-check'), () =>
        apiError(409, { code: 'JOB_ALREADY_RUNNING' }),
      ),
    );
    const { user } = await renderRoute('/admin/videos', { as: 'admin' });
    expect(await screen.findByRole('heading', { name: 'All videos are available' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Run check now' }));
    expect(
      await screen.findByText('A check is already running. Try again when it finishes.'),
    ).toBeVisible();
  });
});
