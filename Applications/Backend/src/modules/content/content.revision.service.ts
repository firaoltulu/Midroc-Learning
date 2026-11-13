import { randomUUID } from 'node:crypto';
import type { Queryable } from '../../core/db/pool.js';
import { verifyPdfFile, verifyVideoLink } from './content.service.js';
import {
  applyRevisionTree,
  assertRevisionIdsBelongToCourse,
  revisionBase,
  validateRevisionTree,
  type RevisionBase,
  type RevisionTree
} from './content.revision.repository.js';
import type { RevisionTreeInput } from './content.schemas.js';

function uuid(id?: string): string {
  return id ?? randomUUID();
}

export async function prepareRevisionTree(input: RevisionTreeInput): Promise<RevisionTree> {
  const modules: RevisionTree['modules'] = [];
  for (const module of input.modules) {
    const items: RevisionTree['modules'][number]['items'] = [];
    for (const item of module.items) {
      if (item.type === 'video') {
        const video = await verifyVideoLink(item.url ?? `https://youtu.be/${item.youtubeVideoId}`);
        items.push({
          id: uuid(item.id),
          type: 'video',
          title: item.title,
          youtubeVideoId: video.youtubeVideoId,
          youtubeTitle: video.title,
          thumbnailUrl: video.thumbnailUrl
        });
      } else if (item.type === 'pdf') {
        const pdf = await verifyPdfFile(item.fileKey);
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

export type { RevisionBase, RevisionTree };
