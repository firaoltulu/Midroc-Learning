import type { AuthoringItem, AuthoringView } from '../api/schemas';
import type {
  CourseRevision,
  RevisionInput,
  RevisionModule,
  RevisionTreeItem,
} from '../api/revision';
import { COURSE_LIMITS, INSTRUCTIONS_MAX, MODULE_DESCRIPTION_MAX, TITLE_MAX } from './limits';
import {
  fromAuthoring as questionsFromAuthoring,
  newKey,
  toInput as questionsToInput,
  validateQuestions,
  type QuestionDraft,
} from './questions';

/**
 * The working copy of a published course (spec section 8): every edit happens here first and
 * is sent as one revision. Existing modules, items, questions and choices keep their `id`
 * (the backend applies revisions by id, so an item moved to another module keeps it); new
 * ones have only a client `key` and are sent without an id.
 */

export type CourseLanguage = 'en' | 'am';

/** Major course fields: they change through a revision. */
export interface WorkingCourse {
  title: string;
  description: string;
  category: string | null;
  language: CourseLanguage;
}

export interface WorkingVideo {
  /** The verified video (live, or from the pending revision); null for a new link. */
  youtubeVideoId: string | null;
  youtubeTitle: string | null;
  /** A new link, verified by the server when the changes are submitted. */
  url: string | null;
}

export interface WorkingPdf {
  fileKey: string;
  sizeBytes: number | null;
  pageCount: number | null;
}

/** Exam settings as typed (strings), checked before submitting. Empty = no limit. */
export interface WorkingExam {
  instructions: string;
  passingScorePercent: string;
  maxAttempts: string;
  timeLimitMinutes: string;
  questions: QuestionDraft[];
}

export interface WorkingItem {
  key: string;
  id?: string;
  type: 'video' | 'pdf' | 'exam';
  title: string;
  video?: WorkingVideo;
  pdf?: WorkingPdf;
  exam?: WorkingExam;
}

export interface WorkingModule {
  key: string;
  id?: string;
  title: string;
  description: string;
  items: WorkingItem[];
}

export interface WorkingCopy {
  course: WorkingCourse;
  modules: WorkingModule[];
}

// ---- From the server --------------------------------------------------------------------

const majorFields = (view: AuthoringView): WorkingCourse => ({
  title: view.course.title,
  description: view.course.description,
  category: view.course.category,
  language: view.course.language,
});

const optional = (value: number | null | undefined) => (value == null ? '' : String(value));

function itemFromLive(item: AuthoringItem): WorkingItem {
  const base = { key: item.id, id: item.id, type: item.type, title: item.title };
  if (item.type === 'video') {
    return {
      ...base,
      video: { youtubeVideoId: item.youtubeVideoId, youtubeTitle: item.youtubeTitle, url: null },
    };
  }
  if (item.type === 'pdf') {
    return {
      ...base,
      pdf: { fileKey: item.fileKey ?? '', sizeBytes: item.sizeBytes, pageCount: item.pageCount },
    };
  }
  return {
    ...base,
    exam: {
      instructions: item.instructions ?? '',
      passingScorePercent: String(item.passingScorePercent ?? 60),
      maxAttempts: optional(item.maxAttempts),
      timeLimitMinutes: optional(item.timeLimitMinutes),
      questions: questionsFromAuthoring(item.questions ?? []),
    },
  };
}

/** The live course as a working copy (no changes). */
export function fromLive(view: AuthoringView): WorkingCopy {
  return {
    course: majorFields(view),
    modules: view.modules.map((module) => ({
      key: module.id,
      id: module.id,
      title: module.title,
      description: module.description,
      items: module.items.map(itemFromLive),
    })),
  };
}

/** Ids that exist in the live course: anything else in a revision is new. */
function liveIds(view: AuthoringView) {
  const ids = new Set<string>();
  for (const module of view.modules) {
    ids.add(module.id);
    for (const item of module.items) {
      ids.add(item.id);
      for (const question of item.questions ?? []) {
        ids.add(question.id);
        for (const choice of question.choices) ids.add(choice.id);
      }
    }
  }
  return ids;
}

/**
 * The pending revision as a working copy: the live major fields with the proposed ones on
 * top, and the proposed tree (or the live tree when only course fields were proposed). The
 * server gives new entries an id when it stores a revision; those ids are dropped here, so
 * new entries stay new.
 */
export function fromRevision(view: AuthoringView, revision: CourseRevision): WorkingCopy {
  const live = fromLive(view);
  const proposed = revision.data.course;
  const course: WorkingCourse = {
    title: typeof proposed.title === 'string' ? proposed.title : live.course.title,
    description:
      typeof proposed.description === 'string' ? proposed.description : live.course.description,
    category:
      typeof proposed.category === 'string' || proposed.category === null
        ? proposed.category
        : live.course.category,
    language:
      proposed.language === 'en' || proposed.language === 'am'
        ? proposed.language
        : live.course.language,
  };
  if (!revision.data.modules) return { course, modules: live.modules };

  const known = liveIds(view);
  const keep = (id: string | undefined) => (id && known.has(id) ? id : undefined);
  const keyed = (id: string | undefined) => {
    const kept = keep(id);
    return kept ? { key: kept, id: kept } : { key: newKey() };
  };

  const modules = revision.data.modules.map((module: RevisionModule): WorkingModule => ({
    ...keyed(module.id),
    title: module.title,
    description: module.description,
    items: module.items.map((item): WorkingItem => {
      const base = { ...keyed(item.id), type: item.type, title: item.title };
      if (item.type === 'video') {
        return {
          ...base,
          video: {
            youtubeVideoId: item.youtubeVideoId ?? null,
            youtubeTitle: item.youtubeTitle ?? null,
            url: null,
          },
        };
      }
      if (item.type === 'pdf') {
        return {
          ...base,
          pdf: {
            fileKey: item.fileKey ?? '',
            sizeBytes: item.sizeBytes ?? null,
            pageCount: item.pageCount ?? null,
          },
        };
      }
      return {
        ...base,
        exam: {
          instructions: item.instructions ?? '',
          passingScorePercent: String(item.passingScorePercent ?? 60),
          maxAttempts: optional(item.maxAttempts),
          timeLimitMinutes: optional(item.timeLimitMinutes),
          questions: (item.questions ?? []).map((question) => ({
            ...keyed(question.id),
            prompt: question.prompt,
            isMultiple: question.isMultiple,
            points: String(question.points),
            choices: question.choices.map((choice) => ({
              ...keyed(choice.id),
              text: choice.text,
              isCorrect: choice.isCorrect,
            })),
          })),
        },
      };
    }),
  }));
  return { course, modules };
}

// ---- Live-tree hash ---------------------------------------------------------------------

/**
 * A fingerprint of what a working copy is based on: the live major fields and structure,
 * plus the pending revision. Fields the author changes directly (minor: thumbnail, tags,
 * duration, module and item titles, module descriptions) are left out, so applying them
 * doesn't make the author's own working copy stale.
 */
export function liveHash(view: AuthoringView, revision: CourseRevision | null): string {
  const structure = {
    course: majorFields(view),
    revision: revision ? [revision.id, revision.submittedAt] : null,
    modules: view.modules.map((module) => [
      module.id,
      module.items.map((item) => [
        item.id,
        item.type,
        item.youtubeVideoId,
        item.fileKey,
        item.instructions,
        item.passingScorePercent,
        item.maxAttempts,
        item.timeLimitMinutes,
        item.questions ?? null,
      ]),
    ]),
  };
  return hashString(JSON.stringify(structure));
}

/** FNV-1a (32 bit), hex. Not cryptographic: it only tells versions apart. */
export function hashString(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// ---- To the server ----------------------------------------------------------------------

const withId = (id: string | undefined) => (id ? { id } : {});
const toNumberOrNull = (value: string) => (value.trim() === '' ? null : Number(value.trim()));

function itemInput(item: WorkingItem): RevisionTreeItem {
  if (item.type === 'video') {
    const video = item.video;
    return {
      ...withId(item.id),
      type: 'video',
      title: item.title.trim(),
      ...(video?.url
        ? { url: video.url.trim() }
        : video?.youtubeVideoId
          ? { youtubeVideoId: video.youtubeVideoId }
          : {}),
    };
  }
  if (item.type === 'pdf') {
    return {
      ...withId(item.id),
      type: 'pdf',
      title: item.title.trim(),
      fileKey: item.pdf?.fileKey ?? '',
    };
  }
  const exam = item.exam;
  return {
    ...withId(item.id),
    type: 'exam',
    title: item.title.trim(),
    instructions: exam?.instructions ?? '',
    passingScorePercent: Number(exam?.passingScorePercent ?? 60),
    maxAttempts: toNumberOrNull(exam?.maxAttempts ?? ''),
    timeLimitMinutes: toNumberOrNull(exam?.timeLimitMinutes ?? ''),
    questions: questionsToInput(exam?.questions ?? []),
  };
}

/** PUT /courses/:id/revision body: all major fields (unchanged ones are ignored by the server) and the whole tree. */
export function toRevisionInput(copy: WorkingCopy): RevisionInput {
  return {
    course: {
      title: copy.course.title.trim(),
      description: copy.course.description,
      category: copy.course.category?.trim() ? copy.course.category.trim() : null,
      language: copy.course.language,
    },
    modules: copy.modules.map((module) => ({
      ...withId(module.id),
      title: module.title.trim(),
      description: module.description,
      items: module.items.map(itemInput),
    })),
  };
}

// ---- Validation before submitting --------------------------------------------------------

export type ProblemTarget = 'course' | 'module' | 'item';

/** A translation key per problem, located by the entity key ('course' for course fields). */
export interface CopyProblem {
  target: ProblemTarget;
  key: string;
  message: string;
}

const isWhole = (value: string) => /^\d+$/.test(value.trim());

/** What would make the revision fail (mirrors the backend's revision schema). */
export function copyProblems(copy: WorkingCopy): CopyProblem[] {
  const problems: CopyProblem[] = [];
  const add = (target: ProblemTarget, key: string, message: string) => {
    problems.push({ target, key, message });
  };
  if (!copy.course.title.trim()) add('course', 'title', 'editor:details.errors.titleRequired');
  if (copy.course.title.length > COURSE_LIMITS.title)
    add('course', 'title', 'editor:field.tooLong');
  if (copy.course.description.length > COURSE_LIMITS.description) {
    add('course', 'description', 'editor:field.tooLong');
  }
  if ((copy.course.category ?? '').length > COURSE_LIMITS.category) {
    add('course', 'category', 'editor:field.tooLong');
  }
  if (copy.modules.length === 0) add('course', 'modules', 'editor:working.problems.noModules');

  for (const module of copy.modules) {
    if (!module.title.trim() || module.title.length > TITLE_MAX) {
      add('module', module.key, 'editor:working.problems.moduleTitle');
    }
    if (module.description.length > MODULE_DESCRIPTION_MAX) {
      add('module', module.key, 'editor:field.tooLong');
    }
    if (module.items.length === 0) add('module', module.key, 'editor:working.problems.emptyModule');
    for (const item of module.items) {
      if (!item.title.trim() || item.title.length > TITLE_MAX) {
        add('item', item.key, 'editor:working.problems.itemTitle');
      }
      if (item.type === 'video' && !item.video?.url?.trim() && !item.video?.youtubeVideoId) {
        add('item', item.key, 'validation:VIDEO_LINK_REQUIRED.default');
      }
      if (item.type === 'pdf' && !item.pdf?.fileKey) {
        add('item', item.key, 'editor:addItem.pdfRequired');
      }
      if (item.type === 'exam' && item.exam) {
        const exam = item.exam;
        if (exam.instructions.length > INSTRUCTIONS_MAX)
          add('item', item.key, 'editor:field.tooLong');
        if (!isWhole(exam.passingScorePercent) || Number(exam.passingScorePercent) > 100) {
          add('item', item.key, 'editor:exam.errors.percent');
        }
        for (const value of [exam.maxAttempts, exam.timeLimitMinutes]) {
          if (value.trim() !== '' && (!isWhole(value) || Number(value) < 1)) {
            add('item', item.key, 'editor:exam.errors.positive');
          }
        }
        if (exam.questions.length === 0)
          add('item', item.key, 'editor:questions.errors.noQuestions');
        else if (validateQuestions(exam.questions).size > 0) {
          add('item', item.key, 'editor:questions.errors.incomplete');
        }
      }
    }
  }
  return problems;
}

// ---- Change summary (client side) -------------------------------------------------------

export interface CopyChange {
  kind: 'added' | 'removed' | 'moved' | 'edited' | 'reordered';
  target: 'course' | 'module' | 'item';
  title: string;
}

/** Equal content; client `key`s don't count (they only exist in this browser). */
const withoutKeys = (value: unknown) =>
  JSON.stringify(value, (name, entry: unknown) => (name === 'key' ? undefined : entry));
const sameJson = (a: unknown, b: unknown) => withoutKeys(a) === withoutKeys(b);

/** What differs from `base` (normally the live course): the "N changes" bar. */
export function summarizeCopy(copy: WorkingCopy, base: WorkingCopy): CopyChange[] {
  const changes: CopyChange[] = [];
  if (!sameJson(copy.course, base.course)) {
    changes.push({ kind: 'edited', target: 'course', title: copy.course.title });
  }

  const baseModules = new Map(base.modules.flatMap((m) => (m.id ? [[m.id, m] as const] : [])));
  const baseItems = new Map(
    base.modules.flatMap((module) =>
      module.items.flatMap((item) =>
        item.id ? [[item.id, { item, moduleId: module.id }] as const] : [],
      ),
    ),
  );
  const seenModules = new Set<string>();
  const seenItems = new Set<string>();

  for (const module of copy.modules) {
    const before = module.id ? baseModules.get(module.id) : undefined;
    if (!before) {
      changes.push({ kind: 'added', target: 'module', title: module.title });
    } else {
      seenModules.add(before.key);
      if (before.title !== module.title || before.description !== module.description) {
        changes.push({ kind: 'edited', target: 'module', title: module.title });
      }
      const order = (items: WorkingItem[]) =>
        items.flatMap((item) =>
          item.id && baseItems.get(item.id)?.moduleId === module.id ? [item.id] : [],
        );
      if (
        !sameJson(
          order(module.items),
          order(before.items).filter((id) => module.items.some((i) => i.id === id)),
        )
      ) {
        changes.push({ kind: 'reordered', target: 'module', title: module.title });
      }
    }
    for (const item of module.items) {
      const previous = item.id ? baseItems.get(item.id) : undefined;
      if (!previous) {
        changes.push({ kind: 'added', target: 'item', title: item.title });
        continue;
      }
      seenItems.add(previous.item.key);
      if (previous.moduleId !== module.id) {
        changes.push({ kind: 'moved', target: 'item', title: item.title });
      }
      if (!sameJson(item, previous.item)) {
        changes.push({ kind: 'edited', target: 'item', title: item.title });
      }
    }
  }

  for (const module of base.modules) {
    if (!seenModules.has(module.key)) {
      changes.push({ kind: 'removed', target: 'module', title: module.title });
    }
    for (const item of module.items) {
      if (!seenItems.has(item.key))
        changes.push({ kind: 'removed', target: 'item', title: item.title });
    }
  }

  const liveOrder = (modules: WorkingModule[]) =>
    modules.flatMap((module) => (module.id && baseModules.has(module.id) ? [module.id] : []));
  const kept = new Set(liveOrder(copy.modules));
  if (
    !sameJson(
      liveOrder(copy.modules),
      liveOrder(base.modules).filter((id) => kept.has(id)),
    )
  ) {
    changes.push({ kind: 'reordered', target: 'course', title: copy.course.title });
  }
  return changes;
}

/** True when two copies propose the same thing (client keys don't count). */
export function sameCopy(a: WorkingCopy, b: WorkingCopy): boolean {
  return sameJson(toRevisionInput(a), toRevisionInput(b));
}
