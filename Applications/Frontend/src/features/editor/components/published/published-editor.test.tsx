import { screen, waitFor, within } from '@testing-library/react';
import { mockAuthoringApi } from '../../../../test/authoring-api';
import { authoringFixture } from '../../../../test/fixtures';
import { apiError } from '../../../../test/msw';
import { renderRoute } from '../../../../test/render';
import { readPersisted } from '../../model/working-copy-store';

// Whole-app editor flows with many interactions: slow when every test file runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const EDIT = '/my-courses/course-1/edit';
const STORAGE_KEY = 'midroc.user.workingCopy.course-1';

const published = (overrides: Record<string, unknown> = {}) =>
  authoringFixture({
    status: 'published',
    publishedAt: '2026-10-05T08:00:00.000Z',
    description: 'Hazards and what to do.',
    ...overrides,
  });

type User = Awaited<ReturnType<typeof renderRoute>>['user'];

/** Types by pasting (one input event). */
async function fill(user: User, field: HTMLElement, text: string) {
  await user.clear(field);
  await user.click(field);
  await user.paste(text);
}

const bar = () => screen.getByRole('region', { name: 'Your changes' });

interface RevisionBody {
  course: Record<string, unknown>;
  modules: {
    id?: string;
    title: string;
    items: { id?: string; type: string; title: string; [field: string]: unknown }[];
  }[];
}

afterEach(() => {
  localStorage.clear();
});

describe('published course: labels and routing', () => {
  it('labels each field and saves minor fields right away, keeping major ones in the copy', async () => {
    const mock = mockAuthoringApi(published());
    const { user } = await renderRoute(EDIT);

    const title = await screen.findByRole('textbox', { name: 'Course title' });
    expect(title).toHaveAccessibleDescription(/^Needs admin review/);
    expect(
      screen.getByRole('textbox', { name: 'Estimated duration (minutes)' }),
    ).toHaveAccessibleDescription(/^Applies right away/);
    expect(
      screen.getByRole('textbox', { name: 'Thumbnail image link' }),
    ).toHaveAccessibleDescription(/^Applies right away/);
    expect(within(bar()).getByText('No changes yet')).toBeVisible();

    // Major: only the working copy changes.
    await fill(user, title, 'Safety at work');
    expect(within(bar()).getByText('1 change')).toBeVisible();

    // Minor: PATCH with only that field.
    await fill(user, screen.getByRole('textbox', { name: 'Estimated duration (minutes)' }), '45');
    await waitFor(() => {
      expect(mock.writes('PATCH', /^\/courses\/course-1$/).map((entry) => entry.body)).toEqual([
        { estimatedDurationMinutes: 45 },
      ]);
    });
    expect(within(bar()).getByText('1 change')).toBeVisible();
    expect(mock.writes('PUT', /revision$/)).toHaveLength(0);
  });

  it('a live module title applies right away; a description of a new module goes to review', async () => {
    const mock = mockAuthoringApi(published());
    const { user } = await renderRoute(`${EDIT}?tab=content`);
    await user.click(await screen.findByRole('button', { name: 'Getting started' }));
    const moduleTitle = await screen.findByRole('textbox', { name: 'Module title' });
    expect(moduleTitle).toHaveAccessibleDescription(/^Applies right away/);
    await fill(user, moduleTitle, 'Before you start');
    await waitFor(() => {
      expect(mock.writes('PATCH', /^\/modules\/module-1$/).map((entry) => entry.body)).toEqual([
        { title: 'Before you start' },
      ]);
    });
    // Applied live and in the copy: not a change to review.
    expect(within(bar()).getByText('No changes yet')).toBeVisible();
  });
});

describe('published course: the revision payload', () => {
  it('keeps ids of existing content (also when moved) and sends new content without ids', async () => {
    const mock = mockAuthoringApi(published());
    const { user } = await renderRoute(`${EDIT}?tab=content`);

    // Move the exam (item-3) into the first module, then remove the empty second module.
    await user.click(await screen.findByRole('button', { name: 'Exam: Final quiz' }));
    await user.click(screen.getByRole('combobox', { name: 'Module' }));
    await user.click(screen.getByRole('option', { name: 'Getting started' }));
    await user.click(screen.getByRole('button', { name: 'Check your knowledge' }));
    await user.click(await screen.findByRole('button', { name: 'Remove module' }));

    // Edit a question's answer text.
    await user.click(screen.getByRole('button', { name: 'Exam: Final quiz' }));
    await fill(user, await screen.findByRole('textbox', { name: 'Answer 2' }), 'Flip-flops');

    // A new module with a new video.
    await user.click(screen.getByRole('button', { name: 'Add module' }));
    let dialog = await screen.findByRole('dialog', { name: 'Add a module' });
    await fill(user, within(dialog).getByRole('textbox', { name: 'Module title' }), 'Ladders');
    await user.click(within(dialog).getByRole('button', { name: 'Add module' }));
    const addButtons = await screen.findAllByRole('button', { name: 'Add item' });
    await user.click(addButtons.at(-1) as HTMLElement);
    dialog = await screen.findByRole('dialog', { name: 'Add an item to Ladders' });
    await fill(
      user,
      within(dialog).getByRole('textbox', { name: 'Item title' }),
      'Climbing safely',
    );
    await fill(
      user,
      within(dialog).getByRole('textbox', { name: 'YouTube link' }),
      'https://youtu.be/zyxwvutsrqp',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Add item' }));

    expect(await within(bar()).findByText('5 changes')).toBeVisible();
    await user.click(within(bar()).getByRole('button', { name: 'Submit changes for review' }));

    await waitFor(() => {
      expect(mock.writes('PUT', /revision$/)).toHaveLength(1);
    });
    const body = mock.writes('PUT', /revision$/)[0]?.body as RevisionBody;
    expect(body.course).toEqual({
      title: 'Workplace safety basics',
      description: 'Hazards and what to do.',
      category: 'Safety',
      language: 'en',
    });
    expect(body.modules).toEqual([
      {
        id: 'module-1',
        title: 'Getting started',
        description: 'Why safety matters.',
        items: [
          { id: 'item-1', type: 'video', title: 'Welcome', youtubeVideoId: 'abcdefghijk' },
          {
            id: 'item-2',
            type: 'pdf',
            title: 'Safety handbook',
            fileKey: '3f6c1a2b-4d5e-4f60-8a1b-2c3d4e5f6a7b.pdf',
          },
          {
            id: 'item-3',
            type: 'exam',
            title: 'Final quiz',
            instructions: 'Answer every question.',
            passingScorePercent: 70,
            maxAttempts: 3,
            timeLimitMinutes: null,
            questions: [
              {
                id: 'q1',
                prompt: 'What do you wear on a construction site?',
                isMultiple: false,
                points: 1,
                choices: [
                  { id: 'c1', text: 'A hard hat', isCorrect: true },
                  { id: 'c2', text: 'Flip-flops', isCorrect: false },
                ],
              },
            ],
          },
        ],
      },
      {
        title: 'Ladders',
        description: '',
        items: [{ type: 'video', title: 'Climbing safely', url: 'https://youtu.be/zyxwvutsrqp' }],
      },
    ]);

    // The server's summary is shown; the course becomes "waiting for review".
    expect(await screen.findByText(/You have changes waiting for review/)).toBeVisible();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('problems are shown instead of submitting', async () => {
    const mock = mockAuthoringApi(published());
    const { user } = await renderRoute(`${EDIT}?tab=content`);
    await user.click(await screen.findByRole('button', { name: 'Add module' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a module' });
    await fill(user, within(dialog).getByRole('textbox', { name: 'Module title' }), 'Empty');
    await user.click(within(dialog).getByRole('button', { name: 'Add module' }));

    const changes = await screen.findByRole('region', { name: 'Your changes' });
    await user.click(
      await within(changes).findByRole('button', { name: 'Submit changes for review' }),
    );
    expect(within(bar()).getByText('Some things need fixing before you can submit.')).toBeVisible();
    expect(mock.writes('PUT', /revision$/)).toHaveLength(0);
    await user.click(within(bar()).getByRole('button', { name: 'Show what to fix' }));
    expect(await screen.findByText('Empty: Add an item, or remove the module.')).toBeVisible();
  });

  it('a refused video is shown on its item', async () => {
    const mock = mockAuthoringApi(published());
    mock.failNext('PUT', /revision$/, () =>
      apiError(422, { code: 'VIDEO_UNAVAILABLE', params: { moduleIndex: 0, itemIndex: 0 } }),
    );
    const { user } = await renderRoute(EDIT);
    await fill(user, await screen.findByRole('textbox', { name: 'Course title' }), 'New title');
    await user.click(within(bar()).getByRole('button', { name: 'Submit changes for review' }));
    await user.click(await within(bar()).findByRole('button', { name: 'Show the item' }));
    const link = await screen.findByRole('textbox', { name: 'New YouTube link' });
    expect(link).toHaveAccessibleDescription(
      "That video is private, deleted or can't be embedded. Choose another video.",
    );
  });

  it('an unchanged copy says there is nothing to review', async () => {
    const mock = mockAuthoringApi(published());
    const { http, HttpResponse } = await import('msw');
    const { api, server } = await import('../../../../test/msw');
    server.use(
      http.put(api('/courses/course-1/revision'), () =>
        HttpResponse.json({ saved: false, unchanged: true, revision: null, changes: [] }),
      ),
    );
    const { user } = await renderRoute(EDIT);
    await screen.findByRole('textbox', { name: 'Course title' });
    await user.click(within(bar()).getByRole('button', { name: 'Submit changes for review' }));
    expect(
      await within(bar()).findByText('Nothing to review: your copy matches the live course.'),
    ).toBeVisible();
    expect(mock.writes('PUT', /revision$/)).toHaveLength(0);
  });
});

describe('published course: stale and not published', () => {
  it('STALE_REVISION keeps the working copy until the owner chooses to reload', async () => {
    const mock = mockAuthoringApi(published());
    mock.failNext('PUT', /revision$/, () => apiError(409, { code: 'STALE_REVISION' }));
    const { user } = await renderRoute(EDIT);
    await fill(user, await screen.findByRole('textbox', { name: 'Course title' }), 'New title');
    await user.click(within(bar()).getByRole('button', { name: 'Submit changes for review' }));

    const alert = await screen.findByText(/This course changed while you were editing/);
    expect(alert).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Course title' })).toHaveValue('New title');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('New title');

    await user.click(screen.getByRole('button', { name: 'Load the latest version' }));
    const dialog = await screen.findByRole('dialog', { name: 'Load the latest version?' });
    await user.click(within(dialog).getByRole('button', { name: 'Load the latest version' }));
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Course title' })).toHaveValue(
        'Workplace safety basics',
      );
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('LOCKED (no longer published) switches to the matching editor', async () => {
    const mock = mockAuthoringApi(published());
    mock.failNext('PUT', /revision$/, () => {
      mock.state.course.status = 'draft';
      return apiError(409, { code: 'LOCKED' });
    });
    const { user } = await renderRoute(EDIT);
    await fill(user, await screen.findByRole('textbox', { name: 'Course title' }), 'New title');
    await user.click(within(bar()).getByRole('button', { name: 'Submit changes for review' }));
    expect(await screen.findByText('Changes save automatically')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Your changes' })).not.toBeInTheDocument();
  });
});

describe('published course: pending revision and persistence', () => {
  const pendingRevision = {
    revision: {
      id: 'revision-9',
      courseId: 'course-1',
      status: 'pending' as const,
      submittedAt: '2026-11-12T09:00:00.000Z',
      data: {
        course: { title: 'Proposed title' },
        modules: [
          {
            id: 'module-1',
            title: 'Getting started',
            description: 'Why safety matters.',
            items: [
              {
                id: 'item-1',
                type: 'video',
                title: 'Welcome',
                youtubeVideoId: 'abcdefghijk',
                youtubeTitle: 'Welcome to safety',
              },
              {
                // Stored with a server id, but not live yet: still new.
                id: '7f1d2c3e-0000-4000-8000-000000000001',
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
    lastDecision: null,
  };

  it('starts from the pending revision; new entries in it stay without ids; withdraw', async () => {
    const mock = mockAuthoringApi(published(), pendingRevision);
    const { user } = await renderRoute(EDIT);
    expect(await screen.findByRole('textbox', { name: 'Course title' })).toHaveValue(
      'Proposed title',
    );
    expect(screen.getByText(/You have changes waiting for review/)).toBeVisible();

    // Resubmitting sends the revision's tree; the not-yet-live video has no id.
    await fill(user, screen.getByRole('textbox', { name: 'Course title' }), 'Proposed title 2');
    await user.click(within(bar()).getByRole('button', { name: 'Submit changes for review' }));
    await waitFor(() => {
      expect(mock.writes('PUT', /revision$/)).toHaveLength(1);
    });
    const body = mock.writes('PUT', /revision$/)[0]?.body as RevisionBody;
    expect(body.modules[0]?.items[1]).toEqual({
      type: 'video',
      title: 'Ladders',
      youtubeVideoId: 'zyxwvutsrqp',
    });

    await user.click(screen.getAllByRole('button', { name: 'Withdraw changes' })[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog', {
      name: 'Withdraw the changes waiting for review?',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Withdraw changes' }));
    await waitFor(() => {
      expect(mock.writes('DELETE', /revision$/)).toHaveLength(1);
    });
    // Out of review, but the edits stay (unsubmitted, also after a reload) to resubmit.
    await waitFor(() => {
      expect(screen.queryByText(/You have changes waiting for review/)).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('textbox', { name: 'Course title' })).toHaveValue('Proposed title 2');
    expect(within(bar()).getByRole('button', { name: 'Submit changes for review' })).toBeVisible();
    expect(readPersisted('course-1')?.copy.course.title).toBe('Proposed title 2');
  });

  it('keeps unsubmitted edits in this browser, and drops them with a notice when the course changed', async () => {
    mockAuthoringApi(published());
    const first = await renderRoute(EDIT);
    await fill(
      first.user,
      await screen.findByRole('textbox', { name: 'Course title' }),
      'Draft title',
    );
    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toContain('Draft title');
    });
    first.unmount();

    // Same live course: restored.
    mockAuthoringApi(published());
    const second = await renderRoute(EDIT);
    expect(await screen.findByRole('textbox', { name: 'Course title' })).toHaveValue('Draft title');
    second.unmount();

    // The live course changed meanwhile: discarded, with a notice.
    mockAuthoringApi(published({ description: 'Changed by an approved revision.' }));
    await renderRoute(EDIT);
    expect(
      await screen.findByText(
        'This course changed since you last edited it in this browser, so those unsubmitted edits were discarded.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Course title' })).toHaveValue(
      'Workplace safety basics',
    );
  });
});
