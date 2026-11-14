import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { authoringFixture, courseFixture } from '../../../test/fixtures';
import { api, apiError, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';

// Whole-app route tests with dialogs: slow when every test file runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const pendingCourse = () => ({
  ...courseFixture({ status: 'pending_review', publishedAt: null }),
  ownerName: 'Abebe Kebede',
  ownerEmail: 'abebe@example.com',
  updatedAt: '2026-11-10T09:00:00.000Z',
  enrollmentCount: 0,
});

function mockQueue() {
  server.use(
    http.get(api('/admin/moderation'), () =>
      HttpResponse.json({
        courses: [pendingCourse()],
        revisions: [
          {
            id: 'revision-1',
            courseId: 'course-2',
            courseTitle: 'Fire safety',
            ownerId: 'owner-2',
            ownerName: 'Sara Tesfaye',
            submittedBy: 'owner-2',
            submittedAt: '2026-11-11T09:00:00.000Z',
          },
        ],
      }),
    ),
  );
}

describe('moderation queues', () => {
  it('lists courses and revisions in tabs; the tab lives in the URL', async () => {
    mockQueue();
    const { user, router } = await renderRoute('/admin/moderation', { as: 'admin' });
    const courses = await screen.findByRole('table', { name: 'New courses' });
    expect(within(courses).getByRole('link', { name: 'Workplace safety basics' })).toHaveAttribute(
      'href',
      '/admin/moderation/courses/course-1',
    );
    expect(within(courses).getByText('abebe@example.com')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: 'Changes to published courses (1)' }));
    const revisions = await screen.findByRole('table', { name: 'Changes to published courses' });
    expect(within(revisions).getByRole('link', { name: 'Fire safety' })).toHaveAttribute(
      'href',
      '/admin/moderation/revisions/revision-1',
    );
    expect(router.state.location.search).toEqual({ tab: 'revisions' });
  });

  it('shows an empty state when nothing waits', async () => {
    server.use(
      http.get(api('/admin/moderation'), () => HttpResponse.json({ courses: [], revisions: [] })),
    );
    await renderRoute('/admin/moderation', { as: 'admin' });
    expect(await screen.findByRole('heading', { name: 'No courses waiting' })).toBeVisible();
  });
});

describe('course review', () => {
  function mockReview() {
    const decisions: { path: string; body: unknown }[] = [];
    server.use(
      http.get(api('/courses/course-1/authoring'), () =>
        HttpResponse.json(authoringFixture({ status: 'pending_review', publishedAt: null })),
      ),
      http.post(api('/admin/courses/course-1/:decision'), async ({ request, params }) => {
        const text = await request.text();
        decisions.push({ path: String(params.decision), body: text ? JSON.parse(text) : null });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    mockQueue();
    return decisions;
  }

  it('renders the authoring view with exam answers', async () => {
    mockReview();
    const { user } = await renderRoute('/admin/moderation/courses/course-1', { as: 'admin' });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Workplace safety basics' }),
    ).toBeVisible();
    await user.click(screen.getByText(/Show the question and answers/));
    expect(screen.getByText(/\(correct answer\)/)).toBeVisible();
  });

  it('requires a reason to reject, then sends it', async () => {
    const decisions = mockReview();
    const { user, router } = await renderRoute('/admin/moderation/courses/course-1', {
      as: 'admin',
    });
    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reject this course?' });

    // Empty (or only spaces): refused on the client, nothing is sent.
    await user.type(within(dialog).getByRole('textbox', { name: /Reason/ }), '   ');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(
      await within(dialog).findByText('Give a reason so the owner knows what to change.'),
    ).toBeVisible();
    expect(within(dialog).getByRole('textbox', { name: /Reason/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(decisions).toEqual([]);

    await user.type(within(dialog).getByRole('textbox', { name: /Reason/ }), 'Add a final exam.');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    await waitFor(() => {
      expect(decisions).toEqual([{ path: 'reject', body: { reason: 'Add a final exam.' } }]);
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/admin/moderation');
    });
    expect(
      (await screen.findAllByText('Course rejected. The owner can see your reason.'))[0],
    ).toBeVisible();
  });

  it('approves after a confirmation', async () => {
    const decisions = mockReview();
    const { user } = await renderRoute('/admin/moderation/courses/course-1', { as: 'admin' });
    await user.click(await screen.findByRole('button', { name: 'Approve and publish' }));
    const dialog = await screen.findByRole('dialog', { name: 'Approve and publish this course?' });
    await user.click(within(dialog).getByRole('button', { name: 'Approve and publish' }));
    await waitFor(() => {
      expect(decisions).toEqual([{ path: 'approve', body: null }]);
    });
  });
});

describe('revision review', () => {
  const live = authoringFixture({ status: 'published' }).modules;
  const reviewBody = (overrides: Record<string, unknown> = {}) => ({
    id: 'revision-1',
    courseId: 'course-1',
    status: 'pending',
    rejectionReason: null,
    submittedBy: 'owner-1',
    submittedAt: '2026-11-11T09:00:00.000Z',
    lastDecision: null,
    changes: [
      { kind: 'edited', target: 'course', title: 'Safety at work', fields: ['title'] },
      { kind: 'added', target: 'item', title: 'Ladders', itemType: 'video' },
      {
        kind: 'moved',
        target: 'item',
        title: 'Final quiz',
        itemType: 'exam',
        fromModule: 'Check your knowledge',
        toModule: 'Getting started',
      },
      {
        kind: 'edited',
        target: 'item',
        title: 'Welcome',
        itemType: 'video',
        fields: ['title', 'video'],
      },
    ],
    diff: {
      course: {
        before: {
          title: 'Workplace safety basics',
          description: 'Ready.',
          category: null,
          language: 'en',
        },
        after: { title: 'Safety at work', description: 'Ready.', category: null, language: 'en' },
      },
      modules: {
        before: live,
        after: [
          {
            ...live[0],
            items: [
              ...(live[0]?.items ?? []),
              {
                id: 'server-new',
                type: 'video',
                title: 'Ladders',
                youtubeVideoId: 'zyxwvutsrqp',
                youtubeTitle: 'Ladder video',
              },
            ],
          },
        ],
      },
    },
    ...overrides,
  });

  function mockRevision(approve: () => Response = () => new HttpResponse(null, { status: 204 })) {
    server.use(
      http.get(api('/admin/revisions/revision-1'), () => HttpResponse.json(reviewBody())),
      http.post(api('/admin/revisions/revision-1/approve'), approve),
    );
    mockQueue();
  }

  it('shows course fields from → to, the change list and the proposed tree', async () => {
    mockRevision();
    const { user } = await renderRoute('/admin/moderation/revisions/revision-1', { as: 'admin' });
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Changes to “Workplace safety basics”',
      }),
    ).toBeVisible();

    // Course details: the old value (removed tone) and the proposed one (added tone).
    const details = screen.getByRole('region', { name: 'Course details' });
    const now = within(details).getByText('Workplace safety basics').closest('[data-tone]');
    const proposed = within(details).getByText('Safety at work').closest('[data-tone]');
    expect(now).toHaveAttribute('data-tone', 'removed');
    expect(now).toHaveTextContent('Now');
    expect(proposed).toHaveAttribute('data-tone', 'added');
    expect(proposed).toHaveTextContent('Proposed');
    expect(within(details).queryByText('Description')).not.toBeInTheDocument();

    // Content changes: kind as text, details on demand.
    const changes = screen.getByRole('list', { name: 'Content changes' });
    expect(within(changes).getByText('Video: Ladders')).toBeVisible();
    expect(within(changes).getByText('Added').closest('[data-tone]')).toHaveAttribute(
      'data-tone',
      'added',
    );
    await user.click(within(changes).getByRole('button', { name: /Moved Exam: Final quiz/ }));
    expect(
      await within(changes).findByText('From “Check your knowledge” to “Getting started”'),
    ).toBeVisible();
    await user.click(within(changes).getByRole('button', { name: /Edited Video: Welcome/ }));
    expect(await within(changes).findByText('Changed: Title, Video')).toBeVisible();

    // Proposed tree: new content is marked.
    const tree = screen.getByRole('region', { name: 'Content after the changes' });
    const ladders = within(tree).getByText('Ladders').closest('li');
    expect(ladders).not.toBeNull();
    expect(within(ladders as HTMLElement).getByText('New')).toBeVisible();
    expect(within(tree).getAllByText('New')).toHaveLength(1);
  });

  it('a stale revision can only be rejected', async () => {
    mockRevision(() => apiError(409, { code: 'STALE_REVISION' }));
    const { user } = await renderRoute('/admin/moderation/revisions/revision-1', { as: 'admin' });
    await user.click(await screen.findByRole('button', { name: 'Approve changes' }));
    const dialog = await screen.findByRole('dialog', { name: 'Approve these changes?' });
    await user.click(within(dialog).getByRole('button', { name: 'Approve changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/can't be applied/);
    expect(screen.queryByRole('button', { name: 'Approve changes' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject changes' })).toBeVisible();
  });

  it('a revision someone else already decided offers no decision', async () => {
    mockRevision(() => apiError(409, { code: 'ALREADY_DECIDED' }));
    const { user } = await renderRoute('/admin/moderation/revisions/revision-1', { as: 'admin' });
    await user.click(await screen.findByRole('button', { name: 'Approve changes' }));
    const dialog = await screen.findByRole('dialog', { name: 'Approve these changes?' });
    await user.click(within(dialog).getByRole('button', { name: 'Approve changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Someone has already reviewed these changes.',
    );
    expect(screen.queryByRole('button', { name: 'Reject changes' })).not.toBeInTheDocument();
  });
});
