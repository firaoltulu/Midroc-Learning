import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { mockAuthoringApi } from '../../../test/authoring-api';
import { courseFixture } from '../../../test/fixtures';
import { api, apiError, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';

/** An OwnedCourse (GET /me/courses): a course without the catalog-only fields. */
const owned = (overrides: Record<string, unknown> = {}) => {
  const course: Record<string, unknown> = courseFixture({
    ownerId: 'user-1',
    updatedAt: '2026-11-10T09:00:00.000Z',
    pendingRevision: null,
    ...overrides,
  });
  delete course.ownerName;
  delete course.enrolled;
  return course;
};

describe('/my-courses', () => {
  it('lists my courses with status, pending changes and the reviewer note; rows open the editor', async () => {
    server.use(
      http.get(api('/me/courses'), () =>
        HttpResponse.json([
          owned({
            id: 'c-draft',
            title: 'Ladder safety',
            status: 'draft',
            moduleCount: 0,
            enrollmentCount: 0,
          }),
          owned({
            id: 'c-live',
            title: 'Fire safety',
            pendingRevision: { id: 'r1', submittedAt: '2026-11-11T09:00:00.000Z' },
          }),
          owned({
            id: 'c-back',
            title: 'First aid',
            status: 'rejected',
            rejectionReason: 'Add a video about burns.',
          }),
        ]),
      ),
    );
    await renderRoute('/my-courses');

    await screen.findByRole('link', { name: 'Ladder safety' });
    const rows = screen.getAllByRole('listitem');
    const row = (title: string) =>
      within(rows.find((item) => within(item).queryByText(title)) as HTMLElement);

    expect(row('Ladder safety').getByText('Draft')).toBeVisible();
    expect(row('Ladder safety').getByText('0 modules')).toBeVisible();
    expect(row('Ladder safety').getByText(/^Updated/)).toBeVisible();
    expect(row('Fire safety').getByText('Published')).toBeVisible();
    expect(row('Fire safety').getByText('Changes in review')).toBeVisible();
    expect(row('Fire safety').getByText(/14 learners enrolled/)).toBeVisible();
    expect(row('First aid').getByText('Rejected')).toBeVisible();
    expect(row('First aid').getByText("Reviewer's note: Add a video about burns.")).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ladder safety' })).toHaveAttribute(
      'href',
      '/my-courses/c-draft/edit',
    );
    expect(screen.getByRole('link', { name: 'Create course' })).toHaveAttribute(
      'href',
      '/my-courses/new',
    );
  });

  it('invites me to create a first course', async () => {
    server.use(http.get(api('/me/courses'), () => HttpResponse.json([])));
    await renderRoute('/my-courses');
    expect(await screen.findByText("You haven't created a course yet")).toBeVisible();
    expect(screen.getByRole('link', { name: 'Create course' })).toBeVisible();
  });

  it('shows an error with a retry', async () => {
    server.use(http.get(api('/me/courses'), () => apiError(500)));
    await renderRoute('/my-courses');
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeVisible();
  });

  it('is in the main navigation', async () => {
    server.use(http.get(api('/me/courses'), () => HttpResponse.json([])));
    await renderRoute('/my-courses');
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByRole('link', { name: 'My courses' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

describe('/my-courses/new', () => {
  it('needs a title, creates a draft and opens it in the editor', async () => {
    const created: unknown[] = [];
    server.use(
      http.post(api('/courses'), async ({ request }) => {
        created.push(await request.json());
        return HttpResponse.json(owned({ id: 'course-1', status: 'draft' }), { status: 201 });
      }),
    );
    mockAuthoringApi();
    const { user, router } = await renderRoute('/my-courses/new');

    await user.click(await screen.findByRole('button', { name: 'Create course' }));
    expect(await screen.findByText('Enter a course title.')).toBeVisible();

    await user.type(screen.getByRole('textbox', { name: 'Course title' }), '  Ladder safety ');
    await user.click(screen.getByRole('button', { name: 'Create course' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/my-courses/course-1/edit');
    });
    expect(created).toEqual([{ title: 'Ladder safety', language: 'en' }]);
    expect(await screen.findByRole('tab', { name: 'Details', selected: true })).toBeVisible();
  });

  it('shows server field problems on the field', async () => {
    server.use(
      http.post(api('/courses'), () =>
        apiError(400, {
          code: 'VALIDATION_FAILED',
          issues: [
            { path: ['title'], code: 'too_big', params: { maximum: 200, origin: 'string' } },
          ],
        }),
      ),
    );
    const { user } = await renderRoute('/my-courses/new');
    await user.type(await screen.findByRole('textbox', { name: 'Course title' }), 'Title');
    await user.click(screen.getByRole('button', { name: 'Create course' }));
    expect(await screen.findByText('Use no more than 200 characters.')).toBeVisible();
  });
});
