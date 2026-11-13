/**
 * Summarizes a revision as a list of changes against the live course, for the owner (after
 * saving) and the reviewing administrator. Pure: no database access.
 *
 * Kinds: added, removed, moved (an item changed module), edited (with the changed fields) and
 * reordered (modules in the course, or items in a module).
 */

export type ItemType = 'video' | 'pdf' | 'exam';

export type RevisionChange = {
  kind: 'added' | 'removed' | 'moved' | 'edited' | 'reordered';
  /** What changed: the course itself, a module, or an item. */
  target: 'course' | 'module' | 'item';
  /** Title of the course, module or item (the proposed title when it changed). */
  title: string;
  itemType?: ItemType;
  /** edited: the changed fields. */
  fields?: string[];
  /** moved: module titles. */
  fromModule?: string;
  toModule?: string;
};

type QuestionLike = {
  prompt: string;
  isMultiple: boolean;
  points: number;
  choices: Array<{ text: string; isCorrect: boolean }>;
};

type ItemLike = {
  id: string;
  type: ItemType;
  title: string;
  youtubeVideoId?: string | null | undefined;
  fileKey?: string | null | undefined;
  instructions?: string | null | undefined;
  passingScorePercent?: number | null | undefined;
  maxAttempts?: number | null | undefined;
  timeLimitMinutes?: number | null | undefined;
  questions?: QuestionLike[] | undefined;
};

export type ModuleLike = {
  id: string;
  title: string;
  description: string;
  items: ItemLike[];
};

const EXAM_SETTINGS = ['instructions', 'passingScorePercent', 'maxAttempts', 'timeLimitMinutes'] as const;

/** Question content without ids or positions. */
const questionsKey = (questions: QuestionLike[] | undefined) =>
  JSON.stringify(
    (questions ?? []).map((question) => ({
      prompt: question.prompt,
      isMultiple: question.isMultiple,
      points: question.points,
      choices: question.choices.map((choice) => ({ text: choice.text, isCorrect: choice.isCorrect }))
    }))
  );

function changedItemFields(live: ItemLike, proposed: ItemLike): string[] {
  if (live.type !== proposed.type) return ['type'];
  const fields: string[] = [];
  if (live.title !== proposed.title) fields.push('title');
  if (live.type === 'video' && live.youtubeVideoId !== proposed.youtubeVideoId) fields.push('video');
  if (live.type === 'pdf' && live.fileKey !== proposed.fileKey) fields.push('file');
  if (live.type === 'exam') {
    for (const field of EXAM_SETTINGS) {
      if ((live[field] ?? null) !== (proposed[field] ?? null)) fields.push(field);
    }
    if (questionsKey(live.questions) !== questionsKey(proposed.questions)) fields.push('questions');
  }
  return fields;
}

/** True when the shared ids appear in a different relative order. */
function reordered(liveIds: string[], proposedIds: string[]): boolean {
  const shared = new Set(liveIds.filter((id) => proposedIds.includes(id)));
  const a = liveIds.filter((id) => shared.has(id));
  const b = proposedIds.filter((id) => shared.has(id));
  return a.some((id, index) => id !== b[index]);
}

export function summarizeRevision(input: {
  courseTitle: string;
  /** Major course fields the revision changes (only changed ones). */
  courseChanges: Record<string, unknown>;
  live: ModuleLike[];
  /** The proposed tree, or undefined when the revision doesn't touch content. */
  proposed: ModuleLike[] | undefined;
}): RevisionChange[] {
  const changes: RevisionChange[] = [];
  const courseFields = Object.keys(input.courseChanges);
  if (courseFields.length > 0) {
    const proposedTitle = input.courseChanges.title;
    changes.push({
      kind: 'edited',
      target: 'course',
      title: typeof proposedTitle === 'string' ? proposedTitle : input.courseTitle,
      fields: courseFields
    });
  }
  const proposed = input.proposed;
  if (!proposed) return changes;

  const liveModules = new Map(input.live.map((module) => [module.id, module]));
  const liveItems = new Map(
    input.live.flatMap((module) => module.items.map((item) => [item.id, { item, module }] as const))
  );
  const proposedModuleIds = new Set(proposed.map((module) => module.id));
  const proposedItemIds = new Set(proposed.flatMap((module) => module.items.map((item) => item.id)));

  for (const module of proposed) {
    const live = liveModules.get(module.id);
    if (!live) {
      changes.push({ kind: 'added', target: 'module', title: module.title });
    } else {
      const fields = [
        ...(live.title !== module.title ? ['title'] : []),
        ...(live.description !== module.description ? ['description'] : [])
      ];
      if (fields.length > 0) changes.push({ kind: 'edited', target: 'module', title: module.title, fields });
    }

    for (const item of module.items) {
      const entry = liveItems.get(item.id);
      if (!entry) {
        changes.push({ kind: 'added', target: 'item', title: item.title, itemType: item.type });
        continue;
      }
      if (entry.module.id !== module.id) {
        changes.push({
          kind: 'moved',
          target: 'item',
          title: item.title,
          itemType: item.type,
          fromModule: entry.module.title,
          toModule: module.title
        });
      }
      const fields = changedItemFields(entry.item, item);
      if (fields.length > 0) {
        changes.push({ kind: 'edited', target: 'item', title: item.title, itemType: item.type, fields });
      }
    }

    if (live && reordered(live.items.map((item) => item.id), module.items.map((item) => item.id))) {
      changes.push({ kind: 'reordered', target: 'module', title: module.title });
    }
  }

  for (const module of input.live) {
    if (!proposedModuleIds.has(module.id)) {
      changes.push({ kind: 'removed', target: 'module', title: module.title });
    }
    for (const item of module.items) {
      // Items of a removed module are covered by the module's removal.
      if (!proposedItemIds.has(item.id) && proposedModuleIds.has(module.id)) {
        changes.push({ kind: 'removed', target: 'item', title: item.title, itemType: item.type });
      }
    }
  }

  if (reordered(input.live.map((module) => module.id), proposed.map((module) => module.id))) {
    changes.push({ kind: 'reordered', target: 'course', title: input.courseTitle });
  }
  return changes;
}
