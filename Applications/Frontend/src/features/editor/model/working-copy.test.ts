import { authoringFixture } from '../../../test/fixtures';
import { courseRevisionSchema } from '../api/revision';
import { authoringViewSchema } from '../api/schemas';
import { FIELD_EFFECTS, fieldEffect } from './field-effects';
import { newQuestion } from './questions';
import {
  copyProblems,
  fromLive,
  fromRevision,
  liveHash,
  sameCopy,
  summarizeCopy,
  toRevisionInput,
} from './working-copy';
import { createWorkingCopyStore, readPersisted, workingCopyStorageKey } from './working-copy-store';

const view = (overrides: Record<string, unknown> = {}) =>
  authoringViewSchema.parse(
    authoringFixture({ status: 'published', description: 'Ready.', ...overrides }),
  );

const storeFor = (courseView = view()) => {
  const base = fromLive(courseView);
  return createWorkingCopyStore({ courseId: 'course-1', base, baseHash: 'h1', copy: base });
};

afterEach(() => {
  localStorage.clear();
});

describe('field effects (one constant)', () => {
  it('minor course fields apply right away, major ones need review', () => {
    expect(FIELD_EFFECTS.course).toEqual({
      title: 'review',
      description: 'review',
      category: 'review',
      language: 'review',
      thumbnailUrl: 'immediate',
      tags: 'immediate',
      estimatedDurationMinutes: 'immediate',
    });
    expect(fieldEffect('module', 'title')).toBe('immediate');
    expect(fieldEffect('item', 'title')).toBe('immediate');
    expect(fieldEffect('item', 'questions')).toBe('review');
    // Content that isn't live yet only exists in the copy.
    expect(fieldEffect('module', 'title', true)).toBe('review');
  });
});

describe('ids', () => {
  it('existing content keeps its ids, also when an item moves to another module', () => {
    const store = storeFor();
    store.getState().moveItem('item-3', 'module-1', 0);
    const input = toRevisionInput(store.getState().copy);
    expect(input.modules[0]?.items.map((item) => item.id)).toEqual(['item-3', 'item-1', 'item-2']);
    expect(input.modules[1]?.items).toEqual([]);
  });

  it('new modules, items, questions and choices are sent without ids', () => {
    const store = storeFor();
    const state = store.getState();
    const moduleKey = state.addModule('New module');
    const itemKey = state.addItem(moduleKey, {
      type: 'exam',
      title: 'Quiz',
      exam: {
        instructions: '',
        passingScorePercent: '60',
        maxAttempts: '',
        timeLimitMinutes: '',
        questions: [],
      },
    });
    state.setQuestions(itemKey, () => [
      {
        ...newQuestion(),
        prompt: 'Which?',
        choices: [
          { key: 'a', text: 'Yes', isCorrect: true },
          { key: 'b', text: 'No', isCorrect: false },
        ],
      },
    ]);
    // A new question in an existing exam, next to the existing one.
    state.setQuestions('item-3', (questions) => [
      ...questions,
      { ...newQuestion(), prompt: 'Extra' },
    ]);

    const input = toRevisionInput(store.getState().copy);
    const added = input.modules[2];
    expect(added).toEqual({
      title: 'New module',
      description: '',
      items: [
        {
          type: 'exam',
          title: 'Quiz',
          instructions: '',
          passingScorePercent: 60,
          maxAttempts: null,
          timeLimitMinutes: null,
          questions: [
            {
              prompt: 'Which?',
              isMultiple: false,
              points: 1,
              choices: [
                { text: 'Yes', isCorrect: true },
                { text: 'No', isCorrect: false },
              ],
            },
          ],
        },
      ],
    });
    const exam = input.modules[1]?.items[0];
    expect(exam?.type === 'exam' && exam.questions.map((question) => question.id)).toEqual([
      'q1',
      undefined,
    ]);
  });

  it('a pending revision keeps live ids and drops ids the server gave new entries', () => {
    const revision = courseRevisionSchema.parse({
      id: 'r1',
      courseId: 'course-1',
      status: 'pending',
      submittedAt: '2026-11-12T09:00:00.000Z',
      data: {
        course: { title: 'Proposed', category: null },
        modules: [
          {
            id: 'module-2',
            title: 'Check your knowledge',
            description: '',
            items: [
              {
                id: 'server-made-id',
                type: 'pdf',
                title: 'New PDF',
                fileKey: 'k.pdf',
                sizeBytes: 10,
                pageCount: 1,
              },
            ],
          },
        ],
      },
    });
    const copy = fromRevision(view(), revision);
    expect(copy.course).toEqual({
      title: 'Proposed',
      description: 'Ready.',
      category: null,
      language: 'en',
    });
    const input = toRevisionInput(copy);
    expect(input.modules).toEqual([
      {
        id: 'module-2',
        title: 'Check your knowledge',
        description: '',
        items: [{ type: 'pdf', title: 'New PDF', fileKey: 'k.pdf' }],
      },
    ]);
  });

  it('an existing video is sent by its id unless a new link was typed', () => {
    const store = storeFor();
    expect(toRevisionInput(store.getState().copy).modules[0]?.items[0]).toEqual({
      id: 'item-1',
      type: 'video',
      title: 'Welcome',
      youtubeVideoId: 'abcdefghijk',
    });
    store.getState().updateItem('item-1', {
      video: {
        youtubeVideoId: 'abcdefghijk',
        youtubeTitle: 'Welcome to safety',
        url: 'https://youtu.be/new',
      },
    });
    expect(toRevisionInput(store.getState().copy).modules[0]?.items[0]).toEqual({
      id: 'item-1',
      type: 'video',
      title: 'Welcome',
      url: 'https://youtu.be/new',
    });
  });
});

describe('change summary', () => {
  it('lists added, removed, moved, edited and reordered against the live course', () => {
    const live = fromLive(view());
    const store = storeFor();
    const state = store.getState();
    state.setCourse({ title: 'New title' });
    state.moveItem('item-3', 'module-1', 3);
    state.removeItem('item-2');
    state.updateModule('module-1', { description: 'Changed' });
    state.addModule('Extra');
    state.orderModules([...store.getState().copy.modules.map((module) => module.key)].reverse());

    expect(summarizeCopy(store.getState().copy, live)).toEqual([
      { kind: 'edited', target: 'course', title: 'New title' },
      { kind: 'added', target: 'module', title: 'Extra' },
      { kind: 'edited', target: 'module', title: 'Getting started' },
      { kind: 'moved', target: 'item', title: 'Final quiz' },
      { kind: 'removed', target: 'item', title: 'Safety handbook' },
      { kind: 'reordered', target: 'course', title: 'New title' },
    ]);
    expect(summarizeCopy(live, live)).toEqual([]);
    expect(sameCopy(live, fromLive(view()))).toBe(true);
  });
});

describe('problems before submitting', () => {
  it('mirror the revision rules', () => {
    const store = storeFor();
    const state = store.getState();
    state.setCourse({ title: ' ' });
    state.addModule('Empty');
    state.setQuestions('item-3', () => []);
    expect(copyProblems(store.getState().copy).map((problem) => problem.message)).toEqual([
      'editor:details.errors.titleRequired',
      'editor:questions.errors.noQuestions',
      'editor:working.problems.emptyModule',
    ]);
  });
});

describe('live hash and persistence', () => {
  it('ignores fields edited directly (titles), not structure or major fields', () => {
    const base = view();
    const renamed = view();
    const firstModule = renamed.modules[0];
    if (firstModule) firstModule.title = 'Renamed';
    expect(liveHash(renamed, null)).toBe(liveHash(base, null));
    expect(liveHash(view({ description: 'Other' }), null)).not.toBe(liveHash(base, null));
    const fewer = view();
    fewer.modules.pop();
    expect(liveHash(fewer, null)).not.toBe(liveHash(base, null));
  });

  it('saves edits per course under the per-user prefix; submitting clears them', () => {
    const store = storeFor();
    store.getState().setCourse({ title: 'Saved title' });
    expect(workingCopyStorageKey('course-1')).toBe('midroc.user.workingCopy.course-1');
    expect(readPersisted('course-1')).toMatchObject({
      baseHash: 'h1',
      copy: { course: { title: 'Saved title' } },
    });
    store.getState().markSubmitted('h2');
    expect(readPersisted('course-1')).toBeNull();
    expect(store.getState().base.course.title).toBe('Saved title');
  });
});
