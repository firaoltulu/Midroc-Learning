import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { courseDetailFixture } from '../../../test/fixtures';
import { api, apiError, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';

/** A course whose server state changes with enroll/unenroll, like the real API. */
function mockCourse(overrides: Record<string, unknown> = {}) {
  let detail = courseDetailFixture(overrides);
  const calls: string[] = [];
  server.use(
    http.get(api('/courses/course-1'), () => HttpResponse.json(detail)),
    http.post(api('/courses/course-1/enroll'), () => {
      calls.push('enroll');
      detail = { ...detail, enrolled: true, enrollmentCount: 15 };
      return HttpResponse.json({ enrolled: true }, { status: 201 });
    }),
    http.delete(api('/courses/course-1/enroll'), () => {
      calls.push('unenroll');
      detail = { ...detail, enrolled: false, enrollmentCount: 14 };
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return calls;
}

const actions = () => screen.getByRole('complementary', { name: 'Course actions' });

describe('course detail', () => {
  it('shows the header, description and outline with item types', async () => {
    mockCourse();
    await renderRoute('/courses/course-1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Workplace safety basics' }),
    ).toBeVisible();
    expect(screen.getByText('By Selam Tesfaye')).toBeVisible();
    expect(screen.getByText('1 h 30 min')).toBeVisible();
    expect(
      screen.getByText('Hazards, protective equipment and what to do in an emergency.'),
    ).toBeVisible();
    // The first module is open; items announce their type.
    expect(screen.getByText('Video:', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Welcome')).toBeVisible();
    // Not enrolled: items are not links yet.
    expect(screen.queryByRole('link', { name: /Welcome/ })).not.toBeInTheDocument();
  });

  it('enroll → Continue at the first item', async () => {
    const calls = mockCourse();
    const { user } = await renderRoute('/courses/course-1');
    await user.click(
      await within(await screen.findByRole('complementary')).findByRole('button', {
        name: 'Enroll',
      }),
    );

    const continueLink = await within(actions()).findByRole('link', { name: 'Continue' });
    expect(continueLink).toHaveAttribute('href', '/learn/course-1/item-1');
    expect(calls).toEqual(['enroll']);
    expect(within(actions()).getByText('0 of 3 items done')).toBeVisible();
    expect(
      screen.getAllByText("You're enrolled. Start whenever you're ready.").length,
    ).toBeGreaterThan(0);
    // Enrolled: items open the player.
    expect(screen.getByRole('link', { name: /Welcome/ })).toHaveAttribute(
      'href',
      '/learn/course-1/item-1',
    );
  });

  it('continues where the learner left off, and shows completed items', async () => {
    mockCourse({ enrolled: true, completedItemIds: ['item-1'] });
    await renderRoute('/courses/course-1');
    expect(
      await within(await screen.findByRole('complementary')).findByRole('link', {
        name: 'Continue',
      }),
    ).toHaveAttribute('href', '/learn/course-1/item-2');
    expect(within(actions()).getByText('1 of 3 items done')).toBeVisible();
    expect(screen.getByTitle('Completed')).toBeInTheDocument();
  });

  it('unenrolling asks first, says progress is kept, then offers Enroll again', async () => {
    const calls = mockCourse({ enrolled: true });
    const { user } = await renderRoute('/courses/course-1');
    await user.click(await screen.findByRole('button', { name: 'Unenroll' }));

    const dialog = screen.getByRole('dialog', { name: 'Unenroll from this course?' });
    expect(dialog).toHaveTextContent('Your progress is kept');
    await user.click(within(dialog).getByRole('button', { name: 'Unenroll' }));

    // The page is hidden from assistive tech while the dialog closes: query it afterwards.
    expect(await screen.findByRole('button', { name: 'Enroll' })).toBeVisible();
    expect(calls).toEqual(['unenroll']);
  });

  it('a failed enroll explains why, in the user language', async () => {
    mockCourse();
    server.use(
      http.post(api('/courses/course-1/enroll'), () =>
        apiError(409, { error: 'Course is not published', code: 'NOT_PUBLISHED' }),
      ),
    );
    const { user } = await renderRoute('/courses/course-1');
    await user.click(
      await within(await screen.findByRole('complementary')).findByRole('button', {
        name: 'Enroll',
      }),
    );
    expect(
      await within(actions()).findByText("This course isn't published anymore."),
    ).toBeVisible();
  });

  it('the owner sees the status, the reviewer note and Edit course', async () => {
    mockCourse({
      ownerId: 'user-1',
      status: 'rejected',
      rejectionReason: 'Add a summary to module 2.',
    });
    await renderRoute('/courses/course-1');
    expect(await screen.findByText('Rejected')).toBeVisible();
    expect(screen.getByText(/returned for changes/)).toBeVisible();
    expect(screen.getByText("Reviewer's note: Add a summary to module 2.")).toBeVisible();
    expect(within(actions()).getByRole('link', { name: 'Edit course' })).toHaveAttribute(
      'href',
      '/my-courses/course-1/edit',
    );
    expect(within(actions()).queryByRole('button', { name: 'Enroll' })).not.toBeInTheDocument();
  });

  it('the owner of a published course sees that changes await review', async () => {
    mockCourse({
      ownerId: 'user-1',
      pendingRevision: { id: 'rev-1', submittedAt: '2026-11-10T10:00:00.000Z' },
    });
    await renderRoute('/courses/course-1');
    expect(await screen.findByText(/Changes to this course are waiting for review/)).toBeVisible();
  });

  it('a missing course says so and links back to the catalog', async () => {
    server.use(http.get(api('/courses/course-1'), () => apiError(404, { code: 'NOT_FOUND' })));
    await renderRoute('/courses/course-1');
    expect(
      await screen.findByRole('heading', { level: 1, name: "This course isn't available" }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Browse courses' })).toHaveAttribute(
      'href',
      '/courses',
    );
  });

  it('marks course content in another language with lang', async () => {
    mockCourse({ language: 'am', title: 'የሥራ ቦታ ደህንነት' });
    await renderRoute('/courses/course-1');
    const heading = await screen.findByRole('heading', { level: 1, name: 'የሥራ ቦታ ደህንነት' });
    expect(heading.closest('[lang="am"]')).not.toBeNull();
  });

  it('refreshes the catalog and My learning after enrolling', async () => {
    mockCourse();
    const { user, queryClient } = await renderRoute('/courses/course-1');
    queryClient.setQueryData(['enrollments', 'list'], []);
    queryClient.setQueryData(['courses', 'list', {}], { items: [] });
    await user.click(
      await within(await screen.findByRole('complementary')).findByRole('button', {
        name: 'Enroll',
      }),
    );
    await waitFor(() => {
      expect(queryClient.getQueryState(['enrollments', 'list'])?.isInvalidated).toBe(true);
    });
    expect(queryClient.getQueryState(['courses', 'list', {}])?.isInvalidated).toBe(true);
  });
});
