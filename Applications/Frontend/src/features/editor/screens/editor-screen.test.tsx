import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { mockAuthoringApi } from '../../../test/authoring-api';
import { authoringFixture } from '../../../test/fixtures';
import { http, HttpResponse } from 'msw';
import { api, apiError, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';

const EDIT = '/my-courses/course-1/edit';

const saveState = () =>
  screen.getByText(
    /^(Changes save automatically|Saving…|All changes saved|Couldn't save some changes|Not saved yet: complete the highlighted fields)$/,
  );

async function openContent(path = `${EDIT}?tab=content`) {
  const view = await renderRoute(path);
  await screen.findByRole('navigation', { name: 'Course content' });
  return view;
}

describe('details: autosave', () => {
  it('shows Saving… then All changes saved, sending only the changed field once', async () => {
    const mock = mockAuthoringApi();
    const { user } = await renderRoute(EDIT);
    const title = await screen.findByRole('textbox', { name: 'Course title' });
    expect(saveState()).toHaveTextContent('Changes save automatically');

    await user.clear(title);
    await user.type(title, 'Safety at work');
    expect(saveState()).toHaveTextContent('Saving…');

    await waitFor(() => {
      expect(saveState()).toHaveTextContent('All changes saved');
    });
    expect(mock.writes('PATCH', /^\/courses\/course-1$/).map((entry) => entry.body)).toEqual([
      { title: 'Safety at work' },
    ]);
    // The header follows the saved title.
    expect(screen.getByRole('heading', { level: 1, name: 'Safety at work' })).toBeVisible();
  });

  it('a failed save says so, on the field and in the indicator', async () => {
    const mock = mockAuthoringApi();
    mock.failNext('PATCH', /^\/courses\/course-1$/, () => apiError(409, { code: 'LOCKED' }));
    const { user } = await renderRoute(EDIT);
    const description = await screen.findByRole('textbox', { name: 'Description' });
    await user.type(description, 'Hazards and what to do.');

    expect(
      await screen.findByText("This course can't be changed in its current review state."),
    ).toBeVisible();
    expect(saveState()).toHaveTextContent("Couldn't save some changes");

    // The next edit tries again.
    await user.type(description, ' More.');
    await waitFor(() => {
      expect(saveState()).toHaveTextContent('All changes saved');
    });
    expect(mock.writes('PATCH', /^\/courses\/course-1$/).at(-1)?.body).toEqual({
      description: 'Hazards and what to do. More.',
    });
  });

  it('an invalid value is not sent and the indicator says it is not saved', async () => {
    const mock = mockAuthoringApi();
    const { user } = await renderRoute(EDIT);
    const title = await screen.findByRole('textbox', { name: 'Course title' });
    await user.clear(title);

    expect(await screen.findByText('Enter a course title.')).toBeVisible();
    expect(saveState()).toHaveTextContent('Not saved yet: complete the highlighted fields');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(mock.writes('PATCH', /^\/courses\/course-1$/)).toHaveLength(0);
  });

  it('choices save at once (language) and the thumbnail must be an http(s) link', async () => {
    const mock = mockAuthoringApi();
    const { user } = await renderRoute(EDIT);
    await user.click(await screen.findByRole('combobox', { name: 'Course language' }));
    await user.click(screen.getByRole('option', { name: 'አማርኛ' }));
    await waitFor(() => {
      expect(mock.writes('PATCH', /^\/courses\/course-1$/).map((entry) => entry.body)).toEqual([
        { language: 'am' },
      ]);
    });

    await user.type(screen.getByRole('textbox', { name: 'Thumbnail image link' }), 'ftp://x');
    expect(
      await screen.findByText('Use a link that starts with http:// or https://.'),
    ).toBeVisible();
  });
});

describe('content: tree and reordering', () => {
  it('moving a module sends the complete module id list in the new order', async () => {
    const mock = mockAuthoringApi();
    const { user } = await openContent();
    await user.click(screen.getByRole('button', { name: 'Getting started' }));
    await user.click(await screen.findByRole('button', { name: 'Move module down' }));

    await waitFor(() => {
      expect(mock.writes('PUT', /modules\/order$/).map((entry) => entry.body)).toEqual([
        { moduleIds: ['module-2', 'module-1'] },
      ]);
    });
    const modules = within(screen.getByRole('list', { name: 'Modules' }));
    const titles = modules
      .getAllByRole('button', { name: /^(Getting started|Check your knowledge)$/ })
      .map((button) => button.textContent);
    expect(titles).toEqual(['Check your knowledge', 'Getting started']);
  });

  it('moving an item sends the complete item id list of its module', async () => {
    const mock = mockAuthoringApi();
    const { user } = await openContent();
    await user.click(screen.getByRole('button', { name: 'Video: Welcome' }));
    await user.click(await screen.findByRole('button', { name: 'Move item down' }));
    await waitFor(() => {
      expect(mock.writes('PUT', /items\/order$/)).toEqual([
        {
          method: 'PUT',
          path: '/modules/module-1/items/order',
          body: { itemIds: ['item-2', 'item-1'] },
        },
      ]);
    });
  });

  it('a refused reorder goes back and explains why', async () => {
    const mock = mockAuthoringApi();
    mock.failNext('PUT', /modules\/order$/, () => apiError(400, { code: 'INVALID_ORDER' }));
    const { user } = await openContent();
    await user.click(screen.getByRole('button', { name: 'Getting started' }));
    await user.click(await screen.findByRole('button', { name: 'Move module down' }));

    expect(
      (
        await screen.findAllByText(
          'The content changed while you were reordering it. Reload and try again.',
        )
      )[0],
    ).toBeVisible();
    const modules = within(screen.getByRole('list', { name: 'Modules' }));
    await waitFor(() => {
      expect(
        modules
          .getAllByRole('button', { name: /^(Getting started|Check your knowledge)$/ })
          .map((button) => button.textContent),
      ).toEqual(['Getting started', 'Check your knowledge']);
    });
  });

  it('every row has a keyboard drag handle with instructions', async () => {
    mockAuthoringApi();
    await openContent();
    const handle = screen.getByRole('button', { name: 'Reorder Getting started' });
    expect(handle).toHaveAttribute('aria-roledescription', 'sortable');
    expect(handle).toHaveAccessibleDescription(
      'To reorder, press Space or Enter to pick up. Use the arrow keys to move, then press Space or Enter to drop, or Escape to cancel.',
    );
    expect(screen.getByRole('button', { name: 'Reorder Welcome' })).toBeVisible();
  });

  it('adds a module and opens it', async () => {
    const mock = mockAuthoringApi();
    const { user } = await openContent();
    await user.click(screen.getByRole('button', { name: 'Add module' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a module' });
    await user.click(within(dialog).getByRole('button', { name: 'Add module' }));
    expect(within(dialog).getByText('Enter a title.')).toBeVisible();

    await user.type(within(dialog).getByRole('textbox', { name: 'Module title' }), 'Wrap-up');
    await user.click(within(dialog).getByRole('button', { name: 'Add module' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Wrap-up' })).toBeVisible();
    expect(mock.writes('POST', /\/modules$/).map((entry) => entry.body)).toEqual([
      { title: 'Wrap-up' },
    ]);
  });

  it('a rejected video link is explained on the link field', async () => {
    const mock = mockAuthoringApi();
    mock.failNext('POST', /\/modules\/module-1\/items$/, () =>
      apiError(422, { code: 'VIDEO_UNAVAILABLE' }),
    );
    const { user } = await openContent();
    await user.click(screen.getAllByRole('button', { name: 'Add item' })[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog', { name: 'Add an item to Getting started' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Item title' }), 'Ladders');
    await user.type(
      within(dialog).getByRole('textbox', { name: 'YouTube link' }),
      'https://youtu.be/private0000',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Add item' }));

    const link = within(dialog).getByRole('textbox', { name: 'YouTube link' });
    await waitFor(() => {
      expect(link).toHaveAccessibleDescription(
        "That video is private, deleted or can't be embedded. Choose another video.",
      );
    });

    // Fixed link: the item is created and opened, showing the verified title.
    await user.clear(link);
    await user.type(link, 'https://youtu.be/zyxwvutsrqp');
    await user.click(within(dialog).getByRole('button', { name: 'Add item' }));
    expect(await screen.findByText('Verified title')).toBeVisible();
    expect(mock.writes('POST', /items$/).at(-1)?.body).toEqual({
      type: 'video',
      title: 'Ladders',
      url: 'https://youtu.be/zyxwvutsrqp',
    });
  });

  it('a PDF is checked, uploaded with progress and attached by its fileKey', async () => {
    const mock = mockAuthoringApi();
    server.use(
      http.post(api('/pdf-uploads'), () =>
        HttpResponse.json(
          {
            fileKey: '9b1d2c3e-4f50-4a6b-8c7d-9e0f1a2b3c4d.pdf',
            sizeBytes: 1_048_576,
            pageCount: 4,
          },
          { status: 201 },
        ),
      ),
    );
    const { user } = await openContent();
    await user.click(screen.getAllByRole('button', { name: 'Add item' })[0] as HTMLElement);
    const dialog = await screen.findByRole('dialog', { name: 'Add an item to Getting started' });
    await user.click(within(dialog).getByRole('radio', { name: 'PDF' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Item title' }), 'Checklist');

    const input = within(dialog).getByLabelText('Choose a PDF');
    // Dropped files skip the picker's accept filter: the client check catches them.
    fireEvent.drop(within(dialog).getByTestId('pdf-dropzone'), {
      dataTransfer: { files: [new File(['hello'], 'notes.txt', { type: 'text/plain' })] },
    });
    expect(within(dialog).getByText("That isn't a PDF. Choose a PDF file.")).toBeVisible();

    await user.upload(input, new File(['%PDF-1.4'], 'checklist.pdf', { type: 'application/pdf' }));
    expect(
      await within(dialog).findByText('checklist.pdf is uploaded (4 pages, 1 MB).'),
    ).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Add item' }));
    await waitFor(() => {
      expect(mock.writes('POST', /items$/).at(-1)?.body).toEqual({
        type: 'pdf',
        title: 'Checklist',
        fileKey: '9b1d2c3e-4f50-4a6b-8c7d-9e0f1a2b3c4d.pdf',
      });
    });
  });
});

describe('content: exam builder', () => {
  /** The card of question `number` (its list item). */
  const questionCard = (number: number) => {
    const card = screen.getByRole('heading', { name: `Question ${String(number)}` }).closest('li');
    if (!card) throw new Error(`No card for question ${String(number)}`);
    return within(card);
  };

  /** Types by pasting (one input event): the builder re-renders on every keystroke. */
  async function fill(
    user: Awaited<ReturnType<typeof openExam>>['user'],
    field: HTMLElement,
    text: string,
  ) {
    await user.click(field);
    await user.paste(text);
  }

  async function openExam() {
    const view = await openContent();
    await view.user.click(screen.getByRole('button', { name: 'Exam: Final quiz' }));
    await screen.findByRole('heading', { name: 'Questions' });
    return view;
  }

  it('validates like the server and saves nothing until the question is complete', async () => {
    const mock = mockAuthoringApi();
    const { user } = await openExam();
    await user.click(screen.getByRole('button', { name: 'Add question' }));
    const card = questionCard(2);
    await fill(user, card.getByRole('textbox', { name: 'Question' }), 'Who checks ladders?');
    await fill(user, card.getByRole('textbox', { name: 'Answer 1' }), 'The supervisor');
    await fill(user, card.getByRole('textbox', { name: 'Answer 2' }), 'Nobody');
    // Leave the question: its problems are shown.
    await user.click(screen.getByRole('heading', { name: 'Questions' }));
    expect(await card.findByText('Mark at least one answer as correct.')).toBeVisible();
    expect(saveState()).toHaveTextContent('Not saved yet: complete the highlighted fields');

    await user.click(card.getByRole('radio', { name: 'Answer 1 is correct' }));
    await waitFor(() => {
      expect(mock.writes('PUT', /questions$/)).toHaveLength(1);
    });
    expect(card.queryByText('Mark at least one answer as correct.')).not.toBeInTheDocument();
  });

  it('sends existing questions and choices with their ids and new ones without', async () => {
    const mock = mockAuthoringApi();
    const { user } = await openExam();
    await user.click(screen.getByRole('button', { name: 'Add question' }));
    const card = questionCard(2);
    await fill(user, card.getByRole('textbox', { name: 'Question' }), 'Pick the hazards');
    await user.click(card.getByRole('combobox', { name: 'Answer type' }));
    await user.click(screen.getByRole('option', { name: 'Several correct answers' }));
    await fill(user, card.getByRole('textbox', { name: 'Answer 1' }), 'Oily rags');
    await fill(user, card.getByRole('textbox', { name: 'Answer 2' }), 'Blocked exits');
    await user.click(card.getByRole('checkbox', { name: 'Answer 1 is correct' }));
    await user.click(card.getByRole('checkbox', { name: 'Answer 2 is correct' }));

    await waitFor(() => {
      expect(mock.writes('PUT', /\/items\/item-3\/questions$/).at(-1)?.body).toEqual({
        questions: [
          {
            id: 'q1',
            prompt: 'What do you wear on a construction site?',
            isMultiple: false,
            points: 1,
            choices: [
              { id: 'c1', text: 'A hard hat', isCorrect: true },
              { id: 'c2', text: 'Sandals', isCorrect: false },
            ],
          },
          {
            prompt: 'Pick the hazards',
            isMultiple: true,
            points: 1,
            choices: [
              { text: 'Oily rags', isCorrect: true },
              { text: 'Blocked exits', isCorrect: true },
            ],
          },
        ],
      });
    });

    // The next save sends the ids the server gave the new question and its answers.
    const saves = mock.writes('PUT', /questions$/).length;
    await user.type(card.getByRole('textbox', { name: 'Question' }), '!');
    await waitFor(() => {
      expect(mock.writes('PUT', /questions$/).length).toBeGreaterThan(saves);
    });
    const last = mock.writes('PUT', /questions$/).at(-1)?.body as {
      questions: { id?: string; prompt: string; choices: { id?: string }[] }[];
    };
    expect(last.questions[1]).toMatchObject({
      id: expect.stringMatching(/^q-new-/),
      prompt: 'Pick the hazards!',
      choices: [{ id: expect.stringMatching(/^c-new-/) }, { id: expect.stringMatching(/^c-new-/) }],
    });
    expect(last.questions).toHaveLength(2);
  });

  it('single answer keeps one correct choice; the answer count is 2 to 10', async () => {
    mockAuthoringApi();
    const { user } = await openExam();
    const card = questionCard(1);
    expect(card.queryByRole('button', { name: /Remove answer/ })).not.toBeInTheDocument();
    for (let count = 2; count < 10; count += 1) {
      await user.click(card.getByRole('button', { name: 'Add answer' }));
    }
    expect(card.getByText('A question can have up to 10 answers.')).toBeVisible();
    expect(card.queryByRole('button', { name: 'Add answer' })).not.toBeInTheDocument();

    await user.click(card.getByRole('radio', { name: 'Answer 2 is correct' }));
    expect(card.getByRole('radio', { name: 'Answer 1 is correct' })).not.toBeChecked();
    expect(card.getByRole('radio', { name: 'Answer 2 is correct' })).toBeChecked();
  });

  it('exam settings save through the item', async () => {
    const mock = mockAuthoringApi();
    const { user } = await openExam();
    const score = screen.getByRole('textbox', { name: 'Passing score (%)' });
    await user.clear(score);
    await user.type(score, '150');
    expect(await screen.findByText('Enter a whole number from 0 to 100.')).toBeVisible();
    await user.clear(score);
    await user.type(score, '80');
    await user.clear(screen.getByRole('textbox', { name: 'Attempts allowed' }));
    await waitFor(() => {
      expect(mock.writes('PATCH', /\/items\/item-3$/).map((entry) => entry.body)).toEqual(
        expect.arrayContaining([{ passingScorePercent: 80 }, { maxAttempts: null }]),
      );
    });
  });
});

describe('review', () => {
  it('shows the checklist and the COURSE_INCOMPLETE problems from the server', async () => {
    const mock = mockAuthoringApi();
    mock.failNext('POST', /submit$/, () =>
      apiError(422, {
        code: 'COURSE_INCOMPLETE',
        params: { problems: ['DESCRIPTION_REQUIRED', 'EMPTY_EXAM'] },
      }),
    );
    const { user } = await renderRoute(`${EDIT}?tab=review`);
    const checklist = await screen.findByRole('list', { name: 'Ready for review?' });
    expect(within(checklist).getByText('The course has a description')).toBeVisible();
    expect(within(checklist).getAllByText('To do')).toHaveLength(1);
    expect(within(checklist).getAllByText('Done')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: 'Submit for review' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("The course isn't ready for review yet:");
    expect(within(alert).getByText('Add a description on the Details tab.')).toBeVisible();
    expect(within(alert).getByText('Add questions to every exam.')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Go to details' }));
    expect(await screen.findByRole('textbox', { name: 'Description' })).toBeVisible();
  });

  it('submitting makes the editor read-only while in review', async () => {
    mockAuthoringApi(authoringFixture({ description: 'Ready.' }));
    const { user } = await renderRoute(`${EDIT}?tab=review`);
    await user.click(await screen.findByRole('button', { name: 'Submit for review' }));

    expect(
      await screen.findByText(
        "This course is waiting for review, so it can't be edited until the review is done.",
      ),
    ).toBeVisible();
    expect(screen.getByText('In review')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Details' }));
    expect(await screen.findByRole('textbox', { name: 'Course title' })).toBeDisabled();
  });
});

describe('status', () => {
  it('in review: read-only, no drag handles, no add buttons', async () => {
    mockAuthoringApi(authoringFixture({ status: 'pending_review' }));
    await openContent();
    expect(screen.queryByRole('button', { name: /^Reorder / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add module' })).not.toBeInTheDocument();
    expect(screen.queryByText('Changes save automatically')).not.toBeInTheDocument();
  });

  it('rejected: the reviewer note is shown and the course can be edited', async () => {
    mockAuthoringApi(
      authoringFixture({ status: 'rejected', rejectionReason: 'Add a video about ladders.' }),
    );
    await renderRoute(EDIT);
    expect(await screen.findByText("Reviewer's note: Add a video about ladders.")).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Course title' })).toBeEnabled();
  });

  it("someone else's or a missing course explains it can't be edited", async () => {
    server.use(
      http.get(api('/courses/nope/authoring'), () => apiError(404, { code: 'NOT_FOUND' })),
    );
    await renderRoute('/my-courses/nope/edit');
    expect(
      await screen.findByRole('heading', { level: 1, name: "This course can't be edited" }),
    ).toBeVisible();
  });
});
