import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { courseDetailFixture } from '../../../test/fixtures';
import { api, apiError, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';

const review = (overrides: Record<string, unknown> = {}) => ({
  id: 'review-0',
  authorName: 'Sara T.',
  rating: 5,
  comment: 'Clear and practical.',
  createdAt: '2026-11-01T08:00:00.000Z',
  updatedAt: '2026-11-02T08:00:00.000Z',
  mine: false,
  ...overrides,
});

/**
 * A course whose server state changes with enroll/unenroll and the viewer's review, like the
 * real API. Reviews come 5 to a page (`reviewCount` in all).
 */
/** Bodies of PUT /courses/course-1/review in the current test. */
let reviewBodies: unknown[] = [];

function mockCourse(overrides: Record<string, unknown> = {}, { reviewCount = 2 } = {}) {
  let detail: Record<string, unknown> = courseDetailFixture(overrides);
  const calls: string[] = [];
  reviewBodies = [];
  const allReviews = Array.from({ length: reviewCount }, (_, index) =>
    review({
      id: `review-${String(index)}`,
      authorName: index === 0 ? 'Sara T.' : `Learner ${String(index)}`,
      createdAt: `2026-10-${String(10 + index).padStart(2, '0')}T08:00:00.000Z`,
    }),
  );
  server.use(
    http.get(api('/courses/course-1'), () => HttpResponse.json(detail)),
    http.get(api('/courses/course-1/reviews'), ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page') ?? '1');
      return HttpResponse.json({
        page,
        pageSize: 5,
        total: allReviews.length,
        items: allReviews.slice((page - 1) * 5, page * 5),
      });
    }),
    http.put(api('/courses/course-1/review'), async ({ request }) => {
      const body = (await request.json()) as { rating: number; comment: string };
      reviewBodies.push(body);
      const mine = { ...body, updatedAt: '2026-11-14T08:00:00.000Z' };
      detail = { ...detail, myReview: mine };
      return HttpResponse.json(mine, { status: 201 });
    }),
    http.delete(api('/courses/course-1/review'), () => {
      calls.push('deleteReview');
      detail = { ...detail, myReview: null };
      return new HttpResponse(null, { status: 204 });
    }),
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
  it('shows the hero, the enroll card facts, what you learn and the syllabus', async () => {
    mockCourse({
      category: 'Safety',
      outcomes: ['Spot hazards', 'Report an incident'],
      skills: ['First aid'],
    });
    await renderRoute('/courses/course-1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Workplace safety basics' }),
    ).toBeVisible();
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: 'Courses' })).toHaveAttribute(
      'href',
      '/courses',
    );
    expect(within(breadcrumb).getByRole('link', { name: 'Safety' })).toHaveAttribute(
      'href',
      '/courses?category=Safety',
    );
    expect(
      screen.getByText('Hazards, protective equipment and what to do in an emergency.'),
    ).toBeVisible();
    expect(screen.getByText('4.5 (12 ratings)')).toBeVisible();
    expect(screen.getByText('Created by Selam Tesfaye · Updated Nov 10, 2026')).toBeVisible();

    // The enroll card.
    expect(within(actions()).getByText('14 already enrolled')).toBeVisible();
    expect(within(actions()).getByText('1 video · 1 PDF · 1 exam')).toBeVisible();
    expect(within(actions()).getByText('Beginner level · about 1 h 30 min')).toBeVisible();
    expect(within(actions()).getByText('Taught in English')).toBeVisible();

    const outcomes = screen.getByRole('region', { name: "What you'll learn" });
    expect(
      within(outcomes)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Spot hazards', 'Report an incident']);
    expect(screen.getByRole('region', { name: "Skills you'll gain" })).toHaveTextContent(
      'First aid',
    );

    // The syllabus: numbered modules, the first open; items say their type.
    const syllabus = screen.getByRole('region', { name: 'Syllabus' });
    expect(
      within(syllabus).getByRole('button', { name: /Module 1.*Getting started/ }),
    ).toBeVisible();
    expect(within(syllabus).getByText('2 items')).toBeVisible();
    expect(within(syllabus).getByText('Welcome')).toBeVisible();
    expect(within(syllabus).getAllByText('Video', { exact: false })[0]).toBeInTheDocument();
    // Not enrolled: items are not links yet.
    expect(screen.queryByRole('link', { name: /Welcome/ })).not.toBeInTheDocument();
  });

  it('shows the rating summary and reviews, a page at a time', async () => {
    mockCourse({}, { reviewCount: 7 });
    const { user } = await renderRoute('/courses/course-1');
    const reviews = await screen.findByRole('region', { name: 'Learner reviews' });
    expect(within(reviews).getByText('12 ratings')).toBeVisible();
    const bars = within(reviews).getByRole('list', { name: 'Ratings by number of stars' });
    expect(within(bars).getByRole('progressbar', { name: '5 stars: 8 ratings' })).toHaveAttribute(
      'aria-valuenow',
      '67',
    );
    expect(within(bars).getByRole('progressbar', { name: '1 stars: 0 ratings' })).toBeVisible();

    expect(await within(reviews).findByText('Sara T.')).toBeVisible();
    expect(within(reviews).getAllByText('Clear and practical.')).toHaveLength(5);
    // Only enrolled learners rate.
    expect(within(reviews).queryByRole('heading', { name: 'Rate this course' })).toBeNull();

    await user.click(within(reviews).getByRole('button', { name: 'Show more reviews' }));
    await waitFor(() => {
      expect(within(reviews).getAllByText('Clear and practical.')).toHaveLength(7);
    });
    expect(within(reviews).queryByRole('button', { name: 'Show more reviews' })).toBeNull();
  });

  it('an enrolled learner rates the course, then updates or deletes the review', async () => {
    const calls = mockCourse({ enrolled: true });
    const { user } = await renderRoute('/courses/course-1');
    const form = await screen.findByRole('region', { name: 'Rate this course' });

    // A rating is required.
    await user.click(within(form).getByRole('button', { name: 'Post review' }));
    expect(within(form).getByText('Choose a rating from 1 to 5 stars.')).toBeVisible();
    expect(reviewBodies).toEqual([]);

    await user.click(within(form).getByRole('radio', { name: '4 stars' }));
    await user.type(within(form).getByRole('textbox', { name: 'Comment (optional)' }), ' Useful. ');
    await user.click(within(form).getByRole('button', { name: 'Post review' }));
    await waitFor(() => {
      expect(reviewBodies).toEqual([{ rating: 4, comment: 'Useful.' }]);
    });
    const mine = await screen.findByRole('region', { name: 'Your review' });
    expect(within(mine).getByRole('button', { name: 'Update review' })).toBeVisible();

    await user.click(within(mine).getByRole('button', { name: 'Delete review' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete your review?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete review' }));
    await waitFor(() => {
      expect(calls).toContain('deleteReview');
    });
    expect(await screen.findByRole('region', { name: 'Rate this course' })).toBeVisible();
  });

  it('an administrator removes a review after confirming; learners see no Remove', async () => {
    mockCourse({}, { reviewCount: 2 });
    const removed: string[] = [];
    server.use(
      http.delete(api('/admin/reviews/:reviewId'), ({ params }) => {
        removed.push(String(params.reviewId));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await renderRoute('/courses/course-1', { as: 'admin' });
    const reviews = await screen.findByRole('region', { name: 'Learner reviews' });
    const remove = await within(reviews).findByRole('button', {
      name: 'Remove the review by Sara T.',
    });
    await user.click(remove);
    const dialog = await screen.findByRole('dialog', { name: 'Remove this review?' });
    expect(dialog).toHaveTextContent('the course rating is recalculated');
    await user.click(within(dialog).getByRole('button', { name: 'Remove review' }));
    await waitFor(() => {
      expect(removed).toEqual(['review-0']);
    });
    expect((await screen.findAllByText('Review removed.')).length).toBeGreaterThan(0);
  });

  it('learners do not see the Remove action', async () => {
    mockCourse({}, { reviewCount: 2 });
    await renderRoute('/courses/course-1');
    const reviews = await screen.findByRole('region', { name: 'Learner reviews' });
    await within(reviews).findByText('Sara T.');
    expect(within(reviews).queryByRole('button', { name: /Remove/ })).toBeNull();
  });

  it('without ratings the hero says so and there is no summary', async () => {
    mockCourse(
      {
        ratingAverage: null,
        ratingCount: 0,
        ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      },
      { reviewCount: 0 },
    );
    await renderRoute('/courses/course-1');
    expect(await screen.findByText('No ratings yet')).toBeVisible();
    const reviews = screen.getByRole('region', { name: 'Learner reviews' });
    expect(
      await within(reviews).findByText('No reviews yet. Learners who take the course can rate it.'),
    ).toBeVisible();
    expect(within(reviews).queryByRole('list', { name: 'Ratings by number of stars' })).toBeNull();
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
