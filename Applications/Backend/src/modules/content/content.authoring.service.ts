import type { Actor } from '../../core/actor.js';
import { db } from '../../core/db/pool.js';
import { withTx } from '../../core/db/tx.js';
import { BadRequest, Conflict, NotFound } from '../../core/http/app-error.js';
import { getCourse, resolveCourseContext } from '../courses/index.js';
import { createExam, loadQuestionsForAuthoring, replaceQuestions, type ExamQuestionInput } from '../exams/index.js';
import { verifyPdfFile, verifyVideoLink } from './content.service.js';
import * as repository from './content.authoring.repository.js';
import type { z } from 'zod';
import type { itemCreateSchema, itemPatchSchema, moduleCreateSchema, modulePatchSchema } from './content.schemas.js';

type ModuleCreate = z.infer<typeof moduleCreateSchema>;
type ModulePatch = z.infer<typeof modulePatchSchema>;
type ItemCreate = z.infer<typeof itemCreateSchema>;
type ItemPatch = z.infer<typeof itemPatchSchema>;

function assertEditable(status: string, structural: boolean): void {
  if (status === 'pending_review' || status === 'archived') {
    throw new Conflict('Course is locked', 'LOCKED');
  }
  if (structural && status === 'published') {
    throw new Conflict('Structural changes require a revision', 'REVISION_REQUIRED');
  }
}

function sameIds(existing: string[], proposed: string[]): boolean {
  return (
    existing.length === proposed.length &&
    existing.every((id) => proposed.includes(id))
  );
}

function ensureNoQuestionIds(questions: ExamQuestionInput[] | undefined): void {
  if (questions?.some((question) => question.id || question.choices.some((choice) => choice.id))) {
    throw new BadRequest('New exams cannot reference existing question or choice ids', 'INVALID_CONTENT_REFERENCE');
  }
}

export async function authoringTree(courseId: string, actor: Actor) {
  const course = await getCourse(courseId, actor);
  const modules = await repository.listModules(db, courseId);
  const result = [];
  for (const module of modules) {
    const items = [];
    for (const item of await repository.listItems(db, module.id)) {
      const questions = item.type === 'exam'
        ? await loadQuestionsForAuthoring(db, item.id)
        : undefined;
      items.push({ ...item, ...(questions === undefined ? {} : { questions }) });
    }
    result.push({ ...module, items });
  }
  return { course, modules: result };
}

export async function createModule(
  actor: Actor,
  courseId: string,
  input: ModuleCreate
) {
  return withTx(async (tx) => {
    const course = await resolveCourseContext(tx, 'course', courseId, actor, { lock: true });
    assertEditable(course.status, true);
    const position = await repository.nextModulePosition(tx, courseId);
    return repository.insertModule(tx, courseId, { ...input, position });
  });
}

export async function patchModule(actor: Actor, moduleId: string, input: ModulePatch): Promise<void> {
  await withTx(async (tx) => {
    const course = await resolveCourseContext(tx, 'module', moduleId, actor, { lock: true });
    assertEditable(course.status, false);
    await repository.updateModule(tx, moduleId, input);
  });
}

export async function deleteModule(actor: Actor, moduleId: string): Promise<void> {
  await withTx(async (tx) => {
    const course = await resolveCourseContext(tx, 'module', moduleId, actor, { lock: true });
    assertEditable(course.status, true);
    await repository.removeModule(tx, moduleId);
  });
}

export async function reorderModules(
  actor: Actor,
  courseId: string,
  ids: string[]
): Promise<void> {
  await withTx(async (tx) => {
    const course = await resolveCourseContext(tx, 'course', courseId, actor, { lock: true });
    assertEditable(course.status, true);
    const existing = await repository.moduleIds(tx, courseId);
    if (!sameIds(existing, ids)) throw new BadRequest('Order must include every module exactly once', 'INVALID_ORDER');
    await repository.saveModuleOrder(tx, ids);
  });
}

async function prepareItem(input: ItemCreate) {
  if (input.type === 'video') return { video: await verifyVideoLink(input.url) };
  if (input.type === 'pdf') return { pdf: { ...await verifyPdfFile(input.fileKey), fileKey: input.fileKey } };
  ensureNoQuestionIds(input.questions);
  return {};
}

export async function createItem(actor: Actor, moduleId: string, input: ItemCreate) {
  const context = await resolveCourseContext(db, 'module', moduleId, actor);
  assertEditable(context.status, true);
  const details = await prepareItem(input);
  return withTx(async (tx) => {
    const locked = await resolveCourseContext(tx, 'module', moduleId, actor, { lock: true });
    assertEditable(locked.status, true);
    const position = await repository.nextItemPosition(tx, moduleId);
    const item = await repository.insertItem(tx, moduleId, input.type, input.title, position);
    if (input.type === 'video') {
      await repository.insertVideoDetail(tx, item.id, details.video!);
    } else if (input.type === 'pdf') {
      await repository.insertPdfDetail(tx, item.id, {
        ...details.pdf!,
        pageCount: details.pdf!.pageCount
      });
    } else {
      await createExam(tx, item.id, input);
      if (input.questions) await replaceQuestions(tx, item.id, input.questions);
    }
    return { id: item.id, type: input.type, title: input.title, position };
  });
}

async function prepareItemPatch(
  itemType: 'video' | 'pdf' | 'exam',
  input: ItemPatch
) {
  if (itemType === 'video') {
    if (input.fileKey || input.instructions !== undefined || input.passingScorePercent !== undefined ||
        input.maxAttempts !== undefined || input.timeLimitMinutes !== undefined) {
      throw new BadRequest('Fields do not match a video item', 'ITEM_TYPE_MISMATCH');
    }
    return input.url === undefined ? {} : { video: await verifyVideoLink(input.url) };
  }
  if (itemType === 'pdf') {
    if (input.url || input.instructions !== undefined || input.passingScorePercent !== undefined ||
        input.maxAttempts !== undefined || input.timeLimitMinutes !== undefined) {
      throw new BadRequest('Fields do not match a PDF item', 'ITEM_TYPE_MISMATCH');
    }
    return input.fileKey === undefined
      ? {}
      : { pdf: { ...await verifyPdfFile(input.fileKey), fileKey: input.fileKey } };
  }
  if (input.url || input.fileKey) throw new BadRequest('Fields do not match an exam item', 'ITEM_TYPE_MISMATCH');
  return {};
}

export async function patchItem(actor: Actor, itemId: string, input: ItemPatch): Promise<void> {
  const context = await resolveCourseContext(db, 'item', itemId, actor);
  assertEditable(context.status, false);
  const type = await repository.itemType(db, itemId);
  if (!type) throw new NotFound('Item not found');
  const details = await prepareItemPatch(type, input);
  const structural =
    input.url !== undefined ||
    input.fileKey !== undefined ||
    input.instructions !== undefined ||
    input.passingScorePercent !== undefined ||
    input.maxAttempts !== undefined ||
    input.timeLimitMinutes !== undefined;
  await withTx(async (tx) => {
    const locked = await resolveCourseContext(tx, 'item', itemId, actor, { lock: true });
    assertEditable(locked.status, structural);
    if (await repository.itemType(tx, itemId) !== type) {
      throw new Conflict('Item changed while editing', 'STALE_REVISION');
    }
    if (input.title !== undefined) await repository.updateItemTitle(tx, itemId, input.title);
    if (details.video) await repository.updateVideoDetail(tx, itemId, details.video);
    if (details.pdf && input.fileKey !== undefined) {
      await repository.updatePdfDetail(tx, itemId, { ...details.pdf, fileKey: input.fileKey });
    }
    if (type === 'exam' && structural) {
      await repository.updateExamSettings(tx, itemId, input);
    }
  });
}

export async function deleteItem(actor: Actor, itemId: string): Promise<void> {
  await withTx(async (tx) => {
    const course = await resolveCourseContext(tx, 'item', itemId, actor, { lock: true });
    assertEditable(course.status, true);
    await repository.removeItem(tx, itemId);
  });
}

export async function reorderItems(actor: Actor, moduleId: string, ids: string[]): Promise<void> {
  await withTx(async (tx) => {
    const course = await resolveCourseContext(tx, 'module', moduleId, actor, { lock: true });
    assertEditable(course.status, true);
    const existing = await repository.itemIds(tx, moduleId);
    if (!sameIds(existing, ids)) throw new BadRequest('Order must include every item exactly once', 'INVALID_ORDER');
    await repository.saveItemOrder(tx, ids);
  });
}

export async function replaceExamQuestions(
  actor: Actor,
  itemId: string,
  questions: ExamQuestionInput[]
): Promise<void> {
  await withTx(async (tx) => {
    const course = await resolveCourseContext(tx, 'item', itemId, actor, { lock: true });
    assertEditable(course.status, true);
    if (await repository.itemType(tx, itemId) !== 'exam') throw new NotFound('Exam not found');
    await replaceQuestions(tx, itemId, questions);
  });
}
