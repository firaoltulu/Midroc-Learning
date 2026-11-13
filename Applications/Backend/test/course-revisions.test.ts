import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { db, setDatabaseForTests } from '../src/core/db/pool.js';
import { Conflict } from '../src/core/http/app-error.js';
import {
  approveCourseRevision,
  saveCourseRevision
} from '../src/modules/editing/editing.revisions.service.js';
import { createPgliteDatabase } from './harness/pglite.js';

/** Saves a revision that must change something; returns the stored revision. */
async function saveRevision(...args: Parameters<typeof saveCourseRevision>) {
  const result = await saveCourseRevision(...args);
  if (!result.saved) throw new Error('Expected the revision to be saved');
  return result.revision;
}

const mocks = vi.hoisted(() => ({
  verifyVideoLink: vi.fn(async () => ({
    youtubeVideoId: 'abcdefghijk',
    title: 'Verified video',
    thumbnailUrl: 'https://img.youtube.com/thumbnail.jpg'
  })),
  verifyPdfFile: vi.fn(async () => ({ sizeBytes: 1234, pageCount: 2 }))
}));

vi.mock('../src/modules/content/content.service.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/modules/content/content.service.js')>()),
  verifyVideoLink: mocks.verifyVideoLink,
  verifyPdfFile: mocks.verifyPdfFile
}));

const ownerId = 'c5c53f56-bb74-4cd7-98c4-a6bbb9ac7e68';
const adminId = '518d1bd3-a07a-462e-9f75-14d0b6802402';
const learnerId = 'f73bd0d1-1f30-4d55-ae72-e70e01465f30';
const courseId = 'c8929b64-76d2-4799-af60-09d35e314f60';
const firstModuleId = 'a2aa2739-dd1a-47cb-bc56-af0032663924';
const secondModuleId = '8d99ce48-7702-4c31-a695-a269337a6d88';
const examId = '568ae546-461e-49ce-95f9-f0c9d91ee6b2';
const questionId = 'f1279187-dba8-41b8-8ba0-9c2a61e37323';
const correctChoiceId = '06354d62-2e96-47a6-a2a5-2155a298a4e1';
const wrongChoiceId = 'c2dc172c-fc0f-429f-8987-15f2db2fb0c2';

describe('published course revisions', () => {
  let closeDatabase: (() => Promise<void>) | undefined;

  afterEach(async () => {
    setDatabaseForTests(undefined);
    await closeDatabase?.();
    closeDatabase = undefined;
    mocks.verifyVideoLink.mockClear();
    mocks.verifyPdfFile.mockClear();
  });

  async function setup() {
    const pglite = createPgliteDatabase();
    closeDatabase = pglite.close;
    setDatabaseForTests(pglite.database);
    for (const migration of [
      '001_init.sql',
      '002_course_content.sql',
      '003_youtube_video.sql',
      '004_course_language.sql'
    ]) {
      await pglite.engine.exec(await readFile(`migrations/${migration}`, 'utf8'));
    }
    await db.query(
      `INSERT INTO users (id, firebase_uid, email) VALUES
       ($1, 'owner-firebase', 'owner@example.test'),
       ($2, 'admin-firebase', 'admin@example.test'),
       ($3, 'learner-firebase', 'learner@example.test')`,
      [ownerId, adminId, learnerId]
    );
    await db.query(
      `INSERT INTO courses (id, owner_id, title, description, status)
       VALUES ($1, $2, 'Live title', 'Live description', 'published')`,
      [courseId, ownerId]
    );
    await db.query(
      `INSERT INTO modules (id, course_id, title, position) VALUES
       ($1, $3, 'First module', 0), ($2, $3, 'Second module', 1)`,
      [firstModuleId, secondModuleId, courseId]
    );
    await db.query(
      `INSERT INTO module_items (id, module_id, type, title, position)
       VALUES ($1, $2, 'exam', 'Live exam', 0)`,
      [examId, firstModuleId]
    );
    await db.query(
      `INSERT INTO exams (item_id, instructions) VALUES ($1, 'Live instructions')`,
      [examId]
    );
    await db.query(
      `INSERT INTO exam_questions (id, exam_id, prompt, position)
       VALUES ($1, $2, 'Original prompt', 0)`,
      [questionId, examId]
    );
    await db.query(
      `INSERT INTO exam_choices (id, question_id, text, is_correct, position) VALUES
       ($1, $3, 'Correct', true, 0), ($2, $3, 'Wrong', false, 1)`,
      [correctChoiceId, wrongChoiceId, questionId]
    );
    await db.query(
      'INSERT INTO exam_attempts (user_id, exam_id) VALUES ($1, $2)',
      [learnerId, examId]
    );
    return {
      owner: { id: ownerId, role: 'user' as const },
      admin: { id: adminId, role: 'admin' as const }
    };
  }

  const existingExamTree = {
    id: firstModuleId,
    title: 'First module',
    description: '',
    items: [{
      id: examId,
      type: 'exam' as const,
      title: 'Live exam',
      instructions: 'Live instructions',
      passingScorePercent: 60,
      maxAttempts: null,
      timeLimitMinutes: null,
      questions: [{
        id: questionId,
        prompt: 'Original prompt',
        isMultiple: false,
        points: 1,
        choices: [
          { id: correctChoiceId, text: 'Correct', isCorrect: true },
          { id: wrongChoiceId, text: 'Wrong', isCorrect: false }
        ]
      }]
    }]
  };

  it('merges course fields, removes reverted keys, and retains the proposed tree', async () => {
    const { owner } = await setup();
    const tree = { modules: [existingExamTree] };
    const first = await saveRevision(owner, courseId, { modules: tree.modules });
    const revisionId = first.id;

    await saveCourseRevision(owner, courseId, { course: { title: 'Proposed title' } });
    const reverted = await saveRevision(owner, courseId, { course: { title: 'Live title' } });

    expect(reverted.id).toBe(revisionId);
    expect(reverted.data.course).toEqual({});
    expect(reverted.data.modules?.[0]?.items[0]?.id).toBe(examId);
  });

  const liveTree = [
    existingExamTree,
    { id: secondModuleId, title: 'Second module', description: '', items: [] }
  ];

  it('saving the live content unchanged saves nothing and withdraws a pending revision', async () => {
    const { owner } = await setup();
    await saveRevision(owner, courseId, { course: { title: 'Proposed title' } });

    const result = await saveCourseRevision(owner, courseId, {
      course: { title: 'Live title' },
      modules: liveTree
    });
    expect(result).toEqual({ saved: false, unchanged: true, revision: null, changes: [] });
    const { rows } = await db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM course_revisions WHERE course_id = $1`,
      [courseId]
    );
    expect(rows[0]?.count).toBe(0);
  });

  it('returns a summary of every change against the live course', async () => {
    const { owner } = await setup();
    const result = await saveCourseRevision(owner, courseId, {
      course: { description: 'New description' },
      modules: [
        { id: secondModuleId, title: 'Second module', description: '', items: [
          { ...existingExamTree.items[0]!, title: 'Moved exam' },
          { type: 'video', title: 'Intro video', url: 'https://youtu.be/abcdefghijk' }
        ] },
        { id: firstModuleId, title: 'First module', description: '', items: [] }
      ]
    });
    expect(result.saved).toBe(true);
    expect(result.changes).toEqual([
      { kind: 'edited', target: 'course', title: 'Live title', fields: ['description'] },
      {
        kind: 'moved',
        target: 'item',
        title: 'Moved exam',
        itemType: 'exam',
        fromModule: 'First module',
        toModule: 'Second module'
      },
      { kind: 'edited', target: 'item', title: 'Moved exam', itemType: 'exam', fields: ['title'] },
      { kind: 'added', target: 'item', title: 'Intro video', itemType: 'video' },
      { kind: 'reordered', target: 'course', title: 'Live title' }
    ]);
  });

  it('verifies and normalizes full trees before saving', async () => {
    const { owner } = await setup();
    const revision = await saveRevision(owner, courseId, {
      modules: [{
        title: 'New module',
        description: '',
        items: [
          { type: 'video', title: 'Video', url: 'https://youtu.be/abcdefghijk' },
          { type: 'pdf', title: 'PDF', fileKey: '6a8f6633-60da-428e-8e98-4a2d0ba91867.pdf' }
        ]
      }]
    });

    expect(mocks.verifyVideoLink).toHaveBeenCalledWith('https://youtu.be/abcdefghijk');
    expect(mocks.verifyPdfFile).toHaveBeenCalledWith('6a8f6633-60da-428e-8e98-4a2d0ba91867.pdf');
    expect(revision.data.modules?.[0]).toMatchObject({
      title: 'New module',
      items: [
        { type: 'video', youtubeVideoId: 'abcdefghijk', youtubeTitle: 'Verified video' },
        { type: 'pdf', sizeBytes: 1234, pageCount: 2 }
      ]
    });
    expect(revision.data.modules?.[0]?.id).toMatch(/[0-9a-f-]{36}/);
    expect(revision.data.modules?.[0]?.items.every((item) => item.id)).toBe(true);
  });

  it('preserves moved exam and question IDs when applying the revision', async () => {
    const { owner, admin } = await setup();
    const proposal = {
      modules: [{
        id: secondModuleId,
        title: 'Second module revised',
        description: '',
        items: [{
          ...existingExamTree.items[0]!,
          title: 'Moved exam'
        }]
      }]
    };
    const revision = await saveRevision(owner, courseId, {
      course: { title: 'Approved title' },
      modules: proposal.modules
    });

    await approveCourseRevision(admin, revision.id);

    const { rows: itemRows } = await db.query<{ id: string; moduleId: string; title: string }>(
      `SELECT id, module_id AS "moduleId", title FROM module_items WHERE id = $1`,
      [examId]
    );
    const { rows: questionRows } = await db.query<{ id: string }>(
      'SELECT id FROM exam_questions WHERE id = $1',
      [questionId]
    );
    const { rows: choiceRows } = await db.query<{ id: string }>(
      'SELECT id FROM exam_choices WHERE id = $1',
      [correctChoiceId]
    );
    const { rows: attempts } = await db.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM exam_attempts WHERE exam_id = $1',
      [examId]
    );
    const { rows: courseRows } = await db.query<{ title: string }>(
      'SELECT title FROM courses WHERE id = $1',
      [courseId]
    );

    expect(itemRows[0]).toEqual({ id: examId, moduleId: secondModuleId, title: 'Moved exam' });
    expect(questionRows).toHaveLength(1);
    expect(choiceRows).toHaveLength(1);
    expect(attempts[0]?.count).toBe(1);
    expect(courseRows[0]?.title).toBe('Approved title');
  });

  it('rejects stale tree references before changing any live data', async () => {
    const { owner, admin } = await setup();
    const revision = await saveRevision(owner, courseId, {
      course: { title: 'Must not apply' },
      modules: [existingExamTree]
    });
    await db.query('DELETE FROM modules WHERE id = $1', [firstModuleId]);

    await expect(approveCourseRevision(admin, revision.id)).rejects.toBeInstanceOf(Conflict);
    const { rows: courseRows } = await db.query<{ title: string }>(
      'SELECT title FROM courses WHERE id = $1',
      [courseId]
    );
    const { rows: revisionRows } = await db.query<{ status: string }>(
      'SELECT status FROM course_revisions WHERE id = $1',
      [revision.id]
    );
    const { rows: moduleRows } = await db.query<{ id: string }>(
      'SELECT id FROM modules WHERE id = $1',
      [secondModuleId]
    );

    expect(courseRows[0]?.title).toBe('Live title');
    expect(revisionRows[0]?.status).toBe('pending');
    expect(moduleRows).toHaveLength(1);
  });
});
