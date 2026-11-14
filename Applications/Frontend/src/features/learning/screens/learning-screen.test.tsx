import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { api, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';

const enrollment = (overrides: Record<string, unknown> = {}) => ({
  id: 'course-1',
  title: 'Workplace safety basics',
  description: '',
  category: 'Safety',
  language: 'en',
  thumbnailUrl: null,
  enrolledAt: '2026-11-02T08:00:00.000Z',
  progressPercent: 40,
  moduleCount: 2,
  currentModule: 1,
  lastActivityAt: '2026-11-02T08:00:00.000Z',
  ...overrides,
});

describe('My learning', () => {
  it('lists enrollments with progress, linking to the course', async () => {
    server.use(
      http.get(api('/me/enrollments'), () =>
        HttpResponse.json([
          enrollment(),
          enrollment({ id: 'course-2', title: 'Leading a team', progressPercent: 100 }),
        ]),
      ),
    );
    await renderRoute('/learn');
    expect(await screen.findByRole('link', { name: 'Workplace safety basics' })).toHaveAttribute(
      'href',
      '/courses/course-1',
    );
    expect(
      screen.getByRole('progressbar', { name: 'Progress in Workplace safety basics' }),
    ).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('In progress')).toBeVisible();
    expect(screen.getByText('Completed')).toBeVisible();
    expect(screen.getAllByText('Enrolled Nov 2, 2026')).toHaveLength(2);
  });

  it('invites to browse when there are none', async () => {
    server.use(http.get(api('/me/enrollments'), () => HttpResponse.json([])));
    await renderRoute('/learn');
    expect(
      await screen.findByRole('heading', { name: "You're not enrolled in any courses" }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Browse courses' })).toHaveAttribute(
      'href',
      '/courses',
    );
  });
});
