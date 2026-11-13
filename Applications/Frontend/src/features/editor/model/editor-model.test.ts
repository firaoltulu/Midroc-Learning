import { authoringFixture } from '../../../test/fixtures';
import { authoringViewSchema } from '../api/schemas';
import { checkPdfFile, PDF_MAX_BYTES } from './pdf-file';
import {
  assignIds,
  fromAuthoring,
  markCorrect,
  newQuestion,
  questionProblems,
  setMultiple,
  toInput,
  validateQuestions,
  type QuestionDraft,
} from './questions';
import { problemsFromParams, readinessProblems } from './readiness';
import { createSaveTracker } from './save-tracker';

const view = () => authoringViewSchema.parse(authoringFixture());

const complete = (overrides: Partial<QuestionDraft> = {}): QuestionDraft => ({
  ...newQuestion(),
  prompt: 'Which?',
  choices: [
    { key: 'a', text: 'Yes', isCorrect: true },
    { key: 'b', text: 'No', isCorrect: false },
  ],
  ...overrides,
});

describe('questions: validation mirrors the backend', () => {
  it('accepts a complete single-answer question', () => {
    expect(questionProblems(complete())).toBeNull();
  });

  it('needs a prompt, answer texts and whole points of 1 or more', () => {
    const problems = questionProblems(
      complete({
        prompt: '  ',
        points: '0',
        choices: [
          { key: 'a', text: '', isCorrect: true },
          { key: 'b', text: 'No', isCorrect: false },
        ],
      }),
    );
    expect(problems).toEqual({
      prompt: 'editor:questions.errors.promptRequired',
      points: 'editor:questions.errors.points',
      choiceText: { a: 'editor:questions.errors.choiceRequired' },
    });
    expect(questionProblems(complete({ points: '1.5' }))?.points).toBe(
      'editor:questions.errors.points',
    );
  });

  it('needs at least one correct answer, exactly one for single answer, and 2–10 answers', () => {
    const none = complete({
      choices: [
        { key: 'a', text: 'Yes', isCorrect: false },
        { key: 'b', text: 'No', isCorrect: false },
      ],
    });
    expect(questionProblems(none)?.choices).toBe('validation:CORRECT_CHOICE_REQUIRED.default');

    const two = complete({
      choices: [
        { key: 'a', text: 'Yes', isCorrect: true },
        { key: 'b', text: 'No', isCorrect: true },
      ],
    });
    expect(questionProblems(two)?.choices).toBe(
      'validation:SINGLE_CORRECT_CHOICE_REQUIRED.default',
    );
    expect(questionProblems({ ...two, isMultiple: true })).toBeNull();

    expect(
      questionProblems(complete({ choices: [{ key: 'a', text: 'Yes', isCorrect: true }] }))
        ?.choices,
    ).toBe('editor:questions.errors.minChoices');
    const eleven = Array.from({ length: 11 }, (_, index) => ({
      key: String(index),
      text: 'x',
      isCorrect: index === 0,
    }));
    expect(questionProblems(complete({ choices: eleven }))?.choices).toBe(
      'editor:questions.errors.maxChoices',
    );
  });

  it('collects problems per question key', () => {
    const bad = complete({ key: 'bad', prompt: '' });
    expect([...validateQuestions([complete({ key: 'ok' }), bad]).keys()]).toEqual(['bad']);
  });
});

describe('questions: editing', () => {
  it('switching to single answer keeps only the first correct answer', () => {
    const multiple = complete({
      isMultiple: true,
      choices: [
        { key: 'a', text: 'A', isCorrect: false },
        { key: 'b', text: 'B', isCorrect: true },
        { key: 'c', text: 'C', isCorrect: true },
      ],
    });
    expect(setMultiple(multiple, false).choices.map((choice) => choice.isCorrect)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('marking correct: single answer moves the mark, multiple toggles it', () => {
    const single = complete();
    expect(markCorrect(single, 'b').choices.map((c) => c.isCorrect)).toEqual([false, true]);
    const multiple = complete({ isMultiple: true });
    expect(markCorrect(multiple, 'b').choices.map((c) => c.isCorrect)).toEqual([true, true]);
    expect(markCorrect(multiple, 'a').choices.map((c) => c.isCorrect)).toEqual([false, false]);
  });
});

describe('questions: ids', () => {
  it('existing questions and choices keep their ids; new ones are sent without', () => {
    const exam = view().modules[1]?.items[0];
    const drafts = [...fromAuthoring(exam?.questions ?? []), complete({ key: 'new' })];
    expect(toInput(drafts)).toEqual([
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
        prompt: 'Which?',
        isMultiple: false,
        points: 1,
        choices: [
          { text: 'Yes', isCorrect: true },
          { text: 'No', isCorrect: false },
        ],
      },
    ]);
  });

  it('after a save, entries sent without an id get the server id, matched by key', () => {
    const sent = [complete({ key: 'new' })];
    const saved = [
      {
        id: 'q9',
        prompt: 'Which?',
        isMultiple: false,
        points: 1,
        position: 0,
        choices: [
          { id: 'c9', text: 'Yes', isCorrect: true },
          { id: 'c10', text: 'No', isCorrect: false },
        ],
      },
    ];
    // Meanwhile the author added another question: it stays new.
    const current = [...sent, complete({ key: 'newer' })];
    const result = assignIds(current, sent, saved);
    expect(result[0]).toMatchObject({ id: 'q9', choices: [{ id: 'c9' }, { id: 'c10' }] });
    expect(result[1]?.id).toBeUndefined();
  });
});

describe('readiness', () => {
  it('lists what the server would refuse', () => {
    expect(readinessProblems(view())).toEqual(['DESCRIPTION_REQUIRED']);
    const empty = view();
    empty.modules = [];
    expect(readinessProblems(empty)).toEqual(['DESCRIPTION_REQUIRED', 'NO_MODULES']);
    const gaps = view();
    gaps.course.description = 'Ready';
    gaps.modules[0]?.items.splice(0);
    gaps.modules[1]?.items[0]?.questions?.splice(0);
    expect(readinessProblems(gaps)).toEqual(['EMPTY_MODULE', 'EMPTY_EXAM']);
  });

  it('reads COURSE_INCOMPLETE params, ignoring unknown problems', () => {
    expect(problemsFromParams({ problems: ['NO_MODULES', 'SOMETHING_NEW', 3] })).toEqual([
      'NO_MODULES',
    ]);
    expect(problemsFromParams(undefined)).toEqual([]);
  });
});

describe('pdf file checks', () => {
  it('accepts PDFs up to 50 MB', () => {
    expect(checkPdfFile({ name: 'a.pdf', type: 'application/pdf', size: 10 })).toBeNull();
    expect(checkPdfFile({ name: 'A.PDF', type: '', size: 10 })).toBeNull();
    expect(checkPdfFile({ name: 'a.docx', type: 'application/msword', size: 10 })).toBe('type');
    expect(checkPdfFile({ name: 'a.pdf', type: 'application/pdf', size: PDF_MAX_BYTES + 1 })).toBe(
      'size',
    );
  });
});

describe('save tracker', () => {
  it('idle → saving (dirty or running) → saved; failures and invalid values win', async () => {
    const tracker = createSaveTracker();
    expect(tracker.getState()).toBe('idle');
    tracker.setDirty('title', true);
    expect(tracker.getState()).toBe('saving');
    expect(tracker.hasUnsaved()).toBe(true);

    let finish: () => void = () => undefined;
    const running = tracker.run('title', () => new Promise<void>((resolve) => (finish = resolve)));
    tracker.setDirty('title', false);
    expect(tracker.getState()).toBe('saving');
    finish();
    await running;
    expect(tracker.getState()).toBe('saved');
    expect(tracker.hasUnsaved()).toBe(false);

    tracker.setInvalid('points', true);
    expect(tracker.getState()).toBe('invalid');
    await expect(tracker.run('title', () => Promise.reject(new Error('x')))).rejects.toThrow();
    expect(tracker.getState()).toBe('error');
    await tracker.run('title', () => Promise.resolve());
    tracker.setInvalid('points', false);
    expect(tracker.getState()).toBe('saved');
  });

  it('a failure the caller explains itself does not stick', async () => {
    const tracker = createSaveTracker();
    await expect(
      tracker.run('structure', () => Promise.reject(new Error('x')), { reportFailure: false }),
    ).rejects.toThrow();
    expect(tracker.getState()).toBe('idle');
  });
});
