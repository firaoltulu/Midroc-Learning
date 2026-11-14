import { randomUUID } from 'node:crypto';
import type { Queryable } from '../../core/db/pool.js';
import { AppError } from '../../core/http/app-error.js';
import { verifyPdfFile, verifyVideoLink } from './content.service.js';
import {
  applyRevisionTree,
  assertRevisionIdsBelongToCourse,
  liveDirectFields,
  revisionBase,
  validateRevisionTree,
  type LiveDirectFields,
  type RevisionBase,
  type RevisionTree
} from './content.revision.repository.js';
import type { RevisionTreeInput } from './content.schemas.js';

function uuid(id?: string): string {
  return id ?? randomUUID();
}

/**
 * Runs a media check (video link, PDF) for one item of the proposed tree. A refusal carries
 * the item's position (`moduleIndex`, `itemIndex`) so the client can show it on that item.
 */
async function verifyAt<T>(moduleIndex: number, itemIndex: number, check: () => Promise<T>): Promise<T> {
  try {
    return await check();
  } catch (error) {
    if (error instanceof AppError) {
      throw new AppError(error.message, error.status, error.code, {
        ...error.params,
        moduleIndex,
        itemIndex
      });
    }
    throw error;
  }
}

export async function prepareRevisionTree(input: RevisionTreeInput): Promise<RevisionTree> {
  const modules: RevisionTree['modules'] = [];
  for (const [moduleIndex, module] of input.modules.entries()) {
    const items: RevisionTree['modules'][number]['items'] = [];
    for (const [itemIndex, item] of module.items.entries()) {
      if (item.type === 'video') {
        const video = await verifyAt(moduleIndex, itemIndex, () =>
          verifyVideoLink(item.url ?? `https://youtu.be/${item.youtubeVideoId}`)
        );
        items.push({
          id: uuid(item.id),
          type: 'video',
          title: item.title,
          youtubeVideoId: video.youtubeVideoId,
          youtubeTitle: video.title,
          thumbnailUrl: video.thumbnailUrl
        });
      } else if (item.type === 'pdf') {
        const pdf = await verifyAt(moduleIndex, itemIndex, () => verifyPdfFile(item.fileKey));
        items.push({
          id: uuid(item.id),
          type: 'pdf',
          title: item.title,
          fileKey: item.fileKey,
          sizeBytes: pdf.sizeBytes,
          pageCount: pdf.pageCount
        });
      } else {
        items.push({
          id: uuid(item.id),
          type: 'exam',
          title: item.title,
          instructions: item.instructions,
          passingScorePercent: item.passingScorePercent,
          maxAttempts: item.maxAttempts,
          timeLimitMinutes: item.timeLimitMinutes,
          questions: item.questions.map((question) => ({
            id: uuid(question.id),
            prompt: question.prompt,
            isMultiple: question.isMultiple,
            points: question.points,
            choices: question.choices.map((choice) => ({
              id: uuid(choice.id),
              text: choice.text,
              isCorrect: choice.isCorrect
            }))
          }))
        });
      }
    }
    modules.push({
      id: uuid(module.id),
      title: module.title,
      description: module.description,
      items
    });
  }
  return { modules };
}

export async function validateRevisionIds(
  queryable: Queryable,
  courseId: string,
  tree: RevisionTree
): Promise<void> {
  await assertRevisionIdsBelongToCourse(queryable, courseId, tree);
}

export async function captureRevisionBase(queryable: Queryable, courseId: string): Promise<RevisionBase> {
  return revisionBase(queryable, courseId);
}

export async function validateAndApplyRevisionTree(
  queryable: Queryable,
  courseId: string,
  tree: RevisionTree,
  base: RevisionBase
): Promise<void> {
  await validateRevisionTree(queryable, courseId, tree, base);
  await applyRevisionTree(queryable, courseId, tree);
}

/** Module and item fields the owner edits directly on the live course. */
export async function readLiveDirectFields(
  queryable: Queryable,
  courseId: string
): Promise<LiveDirectFields> {
  return liveDirectFields(queryable, courseId);
}

export type { LiveDirectFields, RevisionBase, RevisionTree };
