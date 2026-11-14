import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { courseDetailFixture } from '../../../../test/fixtures';
import { api, apiError, server } from '../../../../test/msw';
import { renderRoute } from '../../../../test/render';

const questions = [
  {
    id: 'q1',
    prompt: 'What do you wear on a construction site?',
    isMultiple: false,
    points: 1,
    position: 0,
    choices: [
      { id: 'q1-a', text: 'A hard hat', position: 0 },
      { id: 'q1-b', text: 'Sandals', position: 1 },
    ],
  },
  {
    id: 'q2',
    prompt: 'Which are fire hazards?',
    isMultiple: true,
    points: 2,
    position: 1,
    choices: [
      { id: 'q2-a', text: 'Oily rags', position: 0 },
      { id: 'q2-b', text: 'Blocked exits', position: 1 },
      { id: 'q2-c', text: 'A fire extinguisher', position: 2 },
    ],
  },
  {
    id: 'q3',
    prompt: 'Who do you report an injury to?',
    isMultiple: false,
    points: 1,
    position: 2,
    choices: [
      { id: 'q3-a', text: 'Your supervisor', position: 0 },
      { id: 'q3-b', text: 'Nobody', position: 1 },
    ],
  },
];

const overview = (overrides: Record<string, unknown> = {}) => ({
  instructions: 'Answer every question. Take your time.',
  passingScorePercent: 70,
  maxAttempts: 3,
  timeLimitMinutes: 15,
  questionCount: 3,
  attemptsUsed: 0,
  attemptsRemaining: 3,
  passed: false,
  hasOpenAttempt: false,
  ...overrides,
});

const result = (overrides: Record<string, unknown> = {}) => ({
  scorePercent: 50,
  passed: false,
  attemptsUsed: 1,
  attemptsRemaining: 2,
  revealAnswers: false,
  results: [
    { questionId: 'q1', isCorrect: true, selectedChoiceIds: ['q1-a'] },
    { questionId: 'q2', isCorrect: false, selectedChoiceIds: ['q2-a'] },
    { questionId: 'q3', isCorrect: false, selectedChoiceIds: [] },
  ],
  ...overrides,
});

interface ExamMock {
  overview?: Record<string, unknown>;
  /** Server time for the Date header (default: now). */
  serverNow?: number;
  /** expiresAt relative to the server time; null = no time limit. */
  expiresInMs?: number | null;
  resumed?: boolean;
  submit?: () => Response;
}

/** The exam item is item-3 of the course fixture. Records submitted bodies. */
function mockExam(options: ExamMock = {}) {
  const submitted: unknown[] = [];
  server.use(
    http.get(api('/courses/course-1'), () =>
      HttpResponse.json(courseDetailFixture({ enrolled: true })),
    ),
    http.get(api('/exams/item-3'), () => HttpResponse.json(overview(options.overview))),
    http.get(api('/exams/item-3/attempts'), () => HttpResponse.json([])),
    http.post(api('/exams/item-3/start'), () => {
      const serverNow = options.serverNow ?? Date.now();
      const expiresInMs = options.expiresInMs === undefined ? 15 * 60_000 : options.expiresInMs;
      return HttpResponse.json(
        {
          attemptId: 'attempt-1',
          resumed: options.resumed ?? false,
          startedAt: new Date(serverNow).toISOString(),
          expiresAt: expiresInMs === null ? null : new Date(serverNow + expiresInMs).toISOString(),
          questions,
        },
        { status: 201, headers: { Date: new Date(serverNow).toUTCString() } },
      );
    }),
    http.post(api('/attempts/attempt-1/submit'), async ({ request }) => {
      submitted.push(await request.json());
      return options.submit ? options.submit() : HttpResponse.json(result());
    }),
    http.get(api('/me/enrollments'), () => HttpResponse.json([])),
    http.get(api('/items/item-3/discussions'), () =>
      HttpResponse.json({ page: 1, pageSize: 10, total: 0, items: [] }),
    ),
    http.get(api('/items/item-3/notes'), () => HttpResponse.json([])),
  );
  return submitted;
}

async function startExam(path = '/learn/course-1/item-3') {
  const view = await renderRoute(path);
  await view.user.click(await screen.findByRole('button', { name: 'Start exam' }));
  await screen.findByRole('heading', { name: /^Question 1 of 3/ });
  return view;
}

afterEach(() => {
  sessionStorage.clear();
  vi.useRealTimers();
});

describe('exam overview', () => {
  it('shows instructions, passing score, attempts and time limit before starting', async () => {
    mockExam();
    await renderRoute('/learn/course-1/item-3');
    expect(await screen.findByText('Answer every question. Take your time.')).toBeVisible();
    expect(screen.getByText('70%')).toBeVisible();
    expect(screen.getByText('15 minutes')).toBeVisible();
    expect(screen.getByText('3 left')).toBeVisible();
    expect(screen.getByText('3 questions')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start exam' })).toBeEnabled();
  });

  it('explains instead of offering Start when no attempts are left', async () => {
    mockExam({ overview: { attemptsRemaining: 0, attemptsUsed: 3 } });
    await renderRoute('/learn/course-1/item-3');
    expect(await screen.findByText("You've used all your attempts for this exam.")).toBeVisible();
    expect(screen.queryByRole('button', { name: /Start exam|Try again/ })).not.toBeInTheDocument();
  });

  it('a passed exam is done: no Start or Try again, even with attempts left', async () => {
    mockExam({ overview: { passed: true, attemptsUsed: 1, attemptsRemaining: 2 } });
    await renderRoute('/learn/course-1/item-3');
    expect(await screen.findByText("You've passed this exam.")).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Start exam|Try again|Resume exam/ }),
    ).not.toBeInTheDocument();
  });

  it('a passed exam with an attempt open elsewhere can still be resumed', async () => {
    mockExam({ overview: { passed: true, attemptsUsed: 2, hasOpenAttempt: true } });
    await renderRoute('/learn/course-1/item-3');
    expect(await screen.findByRole('button', { name: 'Resume exam' })).toBeVisible();
  });

  it('ATTEMPTS_EXHAUSTED on start explains it and refreshes the counts', async () => {
    mockExam();
    let overviewCalls = 0;
    server.use(
      http.get(api('/exams/item-3'), () => {
        overviewCalls += 1;
        return HttpResponse.json(overview());
      }),
      http.post(api('/exams/item-3/start'), () =>
        apiError(409, { code: 'ATTEMPTS_EXHAUSTED', error: 'No attempts remaining' }),
      ),
    );
    const { user } = await renderRoute('/learn/course-1/item-3');
    await user.click(await screen.findByRole('button', { name: 'Start exam' }));
    expect(await screen.findByText("You've used all your attempts for this exam.")).toBeVisible();
    await waitFor(() => {
      expect(overviewCalls).toBeGreaterThan(1);
    });
  });
});

describe('taking an exam', () => {
  it('the navigator shows answered, unanswered and current questions and jumps between them', async () => {
    mockExam();
    const { user } = await startExam();
    const navigator = screen.getByRole('navigation', { name: 'Questions' });
    expect(within(navigator).getAllByRole('button')).toHaveLength(3);
    expect(
      within(navigator).getByRole('button', { name: 'Question 1, not answered' }),
    ).toHaveAttribute('aria-current', 'step');

    await user.click(screen.getByRole('radio', { name: 'A hard hat' }));
    expect(within(navigator).getByRole('button', { name: 'Question 1, answered' })).toBeVisible();

    await user.click(within(navigator).getByRole('button', { name: 'Question 3, not answered' }));
    const heading = screen.getByRole('heading', { name: /^Question 3 of 3/ });
    expect(heading).toHaveFocus();
    expect(
      within(navigator).getByRole('button', { name: 'Question 3, not answered' }),
    ).toHaveAttribute('aria-current', 'step');

    // Multi-answer questions use checkboxes and say so.
    await user.click(within(navigator).getByRole('button', { name: 'Question 2, not answered' }));
    expect(screen.getByText(/Select all that apply/)).toBeVisible();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('confirms before submitting with unanswered questions, then submits only answers', async () => {
    const submitted = mockExam();
    const { user } = await startExam();
    await user.click(screen.getByRole('radio', { name: 'A hard hat' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('checkbox', { name: 'Oily rags' }));
    await user.click(screen.getByRole('checkbox', { name: 'Blocked exits' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Review answers' }));

    expect(screen.getByText("1 question isn't answered yet.")).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    const dialog = screen.getByRole('dialog', { name: 'Submit with 1 question unanswered?' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep answering' }));
    expect(submitted).toEqual([]);

    // The page is hidden from assistive tech while the dialog closes.
    await user.click(await screen.findByRole('button', { name: 'Submit answers' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Submit anyway' }),
    );
    expect(await screen.findByRole('heading', { name: "You didn't pass this time" })).toBeVisible();
    expect(submitted).toEqual([
      {
        answers: [
          { questionId: 'q1', choiceIds: ['q1-a'] },
          { questionId: 'q2', choiceIds: ['q2-a', 'q2-b'] },
        ],
      },
    ]);
  });

  it('keeps answers per attempt in sessionStorage and restores them when resumed after a refresh', async () => {
    mockExam();
    const first = await startExam();
    await first.user.click(screen.getByRole('radio', { name: 'A hard hat' }));
    expect(JSON.parse(sessionStorage.getItem('midroc.exam.attempt-1') ?? '{}')).toEqual({
      q1: ['q1-a'],
    });
    first.unmount();

    // "Refresh": a new page; the server resumes the open attempt.
    mockExam({ resumed: true, overview: { hasOpenAttempt: true } });
    const { user } = await renderRoute('/learn/course-1/item-3');
    await user.click(await screen.findByRole('button', { name: 'Resume exam' }));
    expect(await screen.findByRole('radio', { name: 'A hard hat' })).toBeChecked();
    expect(
      within(screen.getByRole('navigation', { name: 'Questions' })).getByRole('button', {
        name: 'Question 1, answered',
      }),
    ).toBeVisible();
  });

  it('runs full screen with its own bar; Save and exit keeps the answers for resuming', async () => {
    mockExam({ resumed: true });
    const { user } = await startExam();
    const exam = screen.getByRole('dialog', { name: 'Final quiz' });
    expect(within(exam).getByText('left')).toBeInTheDocument();
    expect(
      within(exam).getByRole('heading', { name: /1 point · Select one answer$/ }),
    ).toBeVisible();
    await user.click(within(exam).getByRole('radio', { name: 'A hard hat' }));

    await user.click(within(exam).getByRole('button', { name: 'Save and exit' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Final quiz' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('status')).toHaveTextContent(/Your answers are saved/);

    // Starting again resumes the same attempt with the answer kept.
    await user.click(screen.getByRole('button', { name: /Start exam|Resume exam/ }));
    const resumed = await screen.findByRole('dialog', { name: 'Final quiz' });
    expect(within(resumed).getByRole('radio', { name: 'A hard hat' })).toBeChecked();
  });

  it('a new (not resumed) attempt starts with no answers', async () => {
    sessionStorage.setItem('midroc.exam.attempt-1', '{"q1":["q1-b"]}');
    mockExam({ resumed: false });
    await startExam();
    expect(screen.getByRole('radio', { name: 'Sandals' })).not.toBeChecked();
  });
});

describe('timer', () => {
  it('counts down on the server clock (Date header), not the local one', async () => {
    // The local clock runs 5 minutes behind the server.
    vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
    const serverNow = Date.parse('2026-11-13T10:00:00.000Z');
    vi.setSystemTime(serverNow - 5 * 60_000);
    mockExam({ serverNow, expiresInMs: 10 * 60_000 });
    await startExam();
    // Without the correction it would read 15:00.
    expect(screen.getByTestId('exam-clock').textContent).toMatch(/^(10:00|9:59)$/);
  });

  it('submits what is answered when time runs out', async () => {
    const submitted = mockExam({ expiresInMs: 2_000 });
    const { user } = await startExam();
    await user.click(screen.getByRole('radio', { name: 'A hard hat' }));
    expect(
      await screen.findByRole('heading', { name: "You didn't pass this time" }, { timeout: 6_000 }),
    ).toBeVisible();
    expect(submitted).toEqual([{ answers: [{ questionId: 'q1', choiceIds: ['q1-a'] }] }]);
    expect(sessionStorage.getItem('midroc.exam.attempt-1')).toBeNull();
  });

  it('EXAM_TIME_EXCEEDED (submitted too late) shows a clear outcome', async () => {
    mockExam({
      submit: () => apiError(410, { code: 'EXAM_TIME_EXCEEDED', error: 'Exam time exceeded' }),
    });
    const { user } = await startExam();
    await user.click(screen.getByRole('radio', { name: 'A hard hat' }));
    await user.click(
      within(screen.getByRole('navigation', { name: 'Questions' })).getByRole('button', {
        name: 'Question 3, not answered',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Review answers' }));
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Submit anyway' }),
    );
    expect(
      await screen.findByText(
        'Time ran out before your answers arrived, so this attempt counts as not passed.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start exam' })).toBeVisible();
  });
});

describe('results', () => {
  async function submitAll(user: Awaited<ReturnType<typeof startExam>>['user']) {
    await user.click(screen.getByRole('radio', { name: 'A hard hat' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('checkbox', { name: 'Oily rags' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('radio', { name: 'Nobody' }));
    await user.click(screen.getByRole('button', { name: 'Review answers' }));
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
  }

  it('without correctChoiceIds: right/wrong per question, no answers revealed', async () => {
    mockExam();
    const { user } = await startExam();
    await submitAll(user);
    expect(await screen.findByText('50%')).toBeVisible();
    expect(screen.getByText('2 attempts left')).toBeVisible();
    expect(screen.getByText('Question 1: correct')).toBeVisible();
    expect(screen.getByText('Question 2: incorrect')).toBeVisible();
    expect(
      screen.getByText('Correct answers appear once you pass or have used all your attempts.'),
    ).toBeVisible();
    expect(screen.queryByText(/^Correct answers?$/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  it('with correctChoiceIds: shows the correct choices for wrong answers', async () => {
    mockExam({
      submit: () =>
        HttpResponse.json(
          result({
            scorePercent: 100,
            passed: true,
            attemptsRemaining: 0,
            revealAnswers: true,
            results: [
              {
                questionId: 'q1',
                isCorrect: true,
                selectedChoiceIds: ['q1-a'],
                correctChoiceIds: ['q1-a'],
              },
              {
                questionId: 'q2',
                isCorrect: false,
                selectedChoiceIds: ['q2-a'],
                correctChoiceIds: ['q2-a', 'q2-b'],
              },
              {
                questionId: 'q3',
                isCorrect: false,
                selectedChoiceIds: ['q3-b'],
                correctChoiceIds: ['q3-a'],
              },
            ],
          }),
        ),
    });
    const { user } = await startExam();
    await submitAll(user);
    expect(await screen.findByRole('heading', { name: 'You passed' })).toBeVisible();
    expect(screen.getByText('Correct answers')).toBeVisible();
    expect(screen.getByText('Blocked exits')).toBeVisible();
    expect(screen.getByText('Correct answer')).toBeVisible();
    expect(screen.getByText('Your supervisor')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('passing with attempts left offers no "Try again"', async () => {
    mockExam({
      submit: () => HttpResponse.json(result({ scorePercent: 100, passed: true })),
    });
    const { user } = await startExam();
    await submitAll(user);
    expect(await screen.findByRole('heading', { name: 'You passed' })).toBeVisible();
    expect(screen.queryByText('2 attempts left')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('"Try again" goes back to the overview', async () => {
    mockExam();
    const { user } = await startExam();
    await submitAll(user);
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Start exam' })).toBeVisible();
  });
});
