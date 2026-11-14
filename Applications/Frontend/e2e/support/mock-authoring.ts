import type { Page, Route } from '@playwright/test';

/**
 * In-memory authoring endpoints for e2e (my courses, create, the draft editor's granular
 * saves, submit). Registered after mockApi, so these routes win; anything else falls back to
 * mockApi. Every write is recorded in `writes`.
 */

interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
}
interface Question {
  id: string;
  prompt: string;
  isMultiple: boolean;
  points: number;
  position: number;
  choices: Choice[];
}
interface Item {
  id: string;
  type: 'video' | 'pdf' | 'exam';
  title: string;
  position: number;
  questions?: Question[];
  [field: string]: unknown;
}
interface Module {
  id: string;
  title: string;
  description: string;
  position: number;
  items: Item[];
}

export interface MockAuthoring {
  writes: { method: string; path: string; body: unknown }[];
}

export interface SeedCourse {
  course: Record<string, unknown>;
  modules: Module[];
}

export interface MockAuthoringOptions {
  /** The owner's email (admin lists show it). */
  ownerEmail?: string;
  /** Courses that exist from the start (e.g. a published one to edit). */
  seed?: SeedCourse[];
}

/** A stored revision: the proposed major course fields and the whole tree (ids assigned). */
interface Revision {
  id: string;
  courseId: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  submittedAt: string;
  course: Record<string, unknown>;
  modules: Module[];
}

/** Mirrors the backend's FIELD_POLICY.major. */
const MAJOR_FIELDS = ['title', 'description', 'category', 'language', 'outcomes'] as const;

/** A course in the published editor's RevisionInput tree, as sent by the client. */
interface TreeModule {
  id?: string;
  title: string;
  description: string;
  items: (Record<string, unknown> & { id?: string; type: Item['type']; title: string })[];
}

export async function mockAuthoring(
  page: Page,
  ownerId: string,
  options: MockAuthoringOptions = {},
): Promise<MockAuthoring> {
  const writes: MockAuthoring['writes'] = [];
  const courses = new Map<string, { course: Record<string, unknown>; modules: Module[] }>();
  for (const entry of options.seed ?? []) {
    courses.set(String(entry.course.id), structuredClone(entry));
  }
  const revisions = new Map<string, Revision>();
  const pendingFor = (courseId: string) =>
    [...revisions.values()].find(
      (revision) => revision.courseId === courseId && revision.status === 'pending',
    );
  let counter = 0;
  const uuid = () => {
    counter += 1;
    return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
  };

  const view = (id: string) => {
    const entry = courses.get(id);
    if (!entry) return null;
    return {
      course: {
        ...entry.course,
        moduleCount: entry.modules.length,
        modules: entry.modules.map(({ items, ...module }) => ({
          ...module,
          items: items.map(({ id: itemId, type, title }) => ({ id: itemId, type, title })),
        })),
      },
      modules: entry.modules,
    };
  };
  const findModule = (id: string) =>
    [...courses.values()].flatMap((entry) => entry.modules).find((module) => module.id === id);
  const findItem = (id: string) =>
    [...courses.values()]
      .flatMap((entry) => entry.modules.flatMap((module) => module.items))
      .find((item) => item.id === id);

  /** A client tree module as stored: new modules, items, questions and choices get ids. */
  const toModule = (module: TreeModule, position: number): Module => ({
    id: module.id ?? uuid(),
    title: module.title,
    description: module.description,
    position,
    items: module.items.map((item, itemPosition) => {
      const questions = item.questions as Question[] | undefined;
      return {
        youtubeVideoId: null,
        youtubeTitle: null,
        isAvailable: null,
        fileKey: null,
        sizeBytes: null,
        pageCount: null,
        instructions: null,
        passingScorePercent: null,
        maxAttempts: null,
        timeLimitMinutes: null,
        ...item,
        id: item.id ?? uuid(),
        position: itemPosition,
        ...(questions
          ? {
              questions: questions.map((question, questionPosition) => ({
                ...question,
                id: (question.id as string | undefined) ?? uuid(),
                position: questionPosition,
                choices: question.choices.map((choice) => ({
                  ...choice,
                  id: (choice.id as string | undefined) ?? uuid(),
                })),
              })),
            }
          : {}),
      };
    }),
  });

  const revisionView = (revision: Revision) => ({
    id: revision.id,
    courseId: revision.courseId,
    status: revision.status,
    submittedAt: revision.submittedAt,
    data: { course: revision.course, modules: revision.modules },
  });

  /** A small summary like the backend's: course fields, added and removed content. */
  const changesOf = (
    entry: { course: Record<string, unknown>; modules: Module[] },
    revision: Revision,
  ) => {
    const changes: Record<string, unknown>[] = [];
    const fields = MAJOR_FIELDS.filter(
      (field) =>
        field in revision.course &&
        JSON.stringify(revision.course[field]) !==
          JSON.stringify(entry.course[field] ?? (field === 'outcomes' ? [] : null)),
    );
    if (fields.length) {
      changes.push({
        kind: 'edited',
        target: 'course',
        title: String(revision.course.title ?? entry.course.title),
        fields: [...fields],
      });
    }
    const liveModules = new Set(entry.modules.map((module) => module.id));
    const liveItems = new Set(
      entry.modules.flatMap((module) => module.items.map((item) => item.id)),
    );
    for (const module of revision.modules) {
      if (!liveModules.has(module.id))
        changes.push({ kind: 'added', target: 'module', title: module.title });
      for (const item of module.items) {
        if (!liveItems.has(item.id) && liveModules.has(module.id)) {
          changes.push({ kind: 'added', target: 'item', title: item.title, itemType: item.type });
        }
      }
    }
    return changes;
  };

  const handle = async (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    const method = request.method();
    const body: unknown = request.postData() ? request.postDataJSON() : undefined;
    const json = (data: unknown, status = 200) => route.fulfill({ status, json: data });
    const noContent = () => route.fulfill({ status: 204 });
    if (method !== 'GET') writes.push({ method, path, body });

    if (path === '/me/courses') {
      return json(
        [...courses.values()].map(({ course, modules }) => ({
          ...course,
          updatedAt: '2026-11-13T10:00:00.000Z',
          moduleCount: modules.length,
          enrollmentCount: 0,
          pendingRevision: (() => {
            const pending = pendingFor(String(course.id));
            return pending ? { id: pending.id, submittedAt: pending.submittedAt } : null;
          })(),
        })),
      );
    }
    if (path === '/courses' && method === 'POST') {
      const input = body as { title: string; language: string };
      const id = uuid();
      const course = {
        id,
        ownerId,
        title: input.title,
        description: '',
        category: null,
        language: input.language,
        thumbnailUrl: null,
        tags: [],
        estimatedDurationMinutes: null,
        level: null,
        outcomes: [],
        skills: [],
        status: 'draft',
        rejectionReason: null,
        createdAt: '2026-11-13T10:00:00.000Z',
        publishedAt: null,
        ownerName: 'Abebe Kebede',
        enrolled: false,
        moduleCount: 0,
        enrollmentCount: 0,
        completedItemIds: [],
        pendingRevision: null,
      };
      courses.set(id, { course, modules: [] });
      return json(course, 201);
    }

    // ---- Published courses: the pending revision (working copy submissions) ----
    let match = /^\/courses\/([^/]+)\/revision$/.exec(path);
    if (match?.[1] && courses.has(match[1])) {
      const courseId = match[1];
      const entry = courses.get(courseId);
      if (method === 'GET') {
        const pending = pendingFor(courseId);
        const decided = [...revisions.values()]
          .filter((revision) => revision.courseId === courseId && revision.status !== 'pending')
          .at(-1);
        return json({
          revision: pending ? revisionView(pending) : null,
          lastDecision: decided
            ? {
                id: decided.id,
                status: decided.status,
                reason: decided.reason,
                reviewedAt: '2026-11-14T10:00:00.000Z',
              }
            : null,
        });
      }
      if (method === 'DELETE') {
        const pending = pendingFor(courseId);
        if (pending) revisions.delete(pending.id);
        return noContent();
      }
      if (method === 'PUT' && entry) {
        const input = body as { course: Record<string, unknown>; modules: TreeModule[] };
        const revision: Revision = {
          id: pendingFor(courseId)?.id ?? uuid(),
          courseId,
          status: 'pending',
          reason: null,
          submittedAt: '2026-11-14T09:00:00.000Z',
          course: input.course,
          modules: input.modules.map((module, position) => toModule(module, position)),
        };
        revisions.set(revision.id, revision);
        return json({
          saved: true,
          unchanged: false,
          revision: revisionView(revision),
          changes: changesOf(entry, revision),
        });
      }
    }

    // ---- Moderation (administrators) ----
    if (path === '/admin/moderation') {
      return json({
        courses: [...courses.values()]
          .filter(({ course }) => course.status === 'pending_review')
          .map(({ course }) => ({
            ...course,
            ownerEmail: options.ownerEmail ?? 'owner@example.com',
            updatedAt: '2026-11-14T08:00:00.000Z',
            enrollmentCount: 0,
          })),
        revisions: [...revisions.values()]
          .filter((revision) => revision.status === 'pending')
          .map((revision) => ({
            id: revision.id,
            courseId: revision.courseId,
            courseTitle: (courses.get(revision.courseId)?.course.title as string | undefined) ?? '',
            ownerId,
            ownerName: 'Abebe Kebede',
            submittedBy: ownerId,
            submittedAt: revision.submittedAt,
          })),
      });
    }
    match = /^\/admin\/courses\/([^/]+)\/(approve|reject)$/.exec(path);
    if (match?.[1] && method === 'POST') {
      const entry = courses.get(match[1]);
      if (!entry || entry.course.status !== 'pending_review') {
        return json({ error: 'Course is locked', code: 'LOCKED' }, 409);
      }
      if (match[2] === 'approve') {
        Object.assign(entry.course, {
          status: 'published',
          publishedAt: '2026-11-14T10:00:00.000Z',
        });
      } else {
        Object.assign(entry.course, {
          status: 'rejected',
          rejectionReason: (body as { reason: string }).reason,
        });
      }
      return noContent();
    }
    match = /^\/admin\/revisions\/([^/]+)$/.exec(path);
    if (match?.[1] && method === 'GET') {
      const revision = revisions.get(match[1]);
      const entry = revision ? courses.get(revision.courseId) : undefined;
      if (!revision || !entry) return json({ error: 'Not found', code: 'NOT_FOUND' }, 404);
      const before = Object.fromEntries(
        MAJOR_FIELDS.map((field) => [
          field,
          entry.course[field] ?? (field === 'outcomes' ? [] : null),
        ]),
      );
      return json({
        id: revision.id,
        courseId: revision.courseId,
        status: revision.status,
        rejectionReason: revision.reason,
        submittedBy: ownerId,
        submittedAt: revision.submittedAt,
        lastDecision: null,
        changes: changesOf(entry, revision),
        diff: {
          course: { before, after: { ...before, ...revision.course } },
          modules: { before: entry.modules, after: revision.modules },
        },
      });
    }
    match = /^\/admin\/revisions\/([^/]+)\/(approve|reject)$/.exec(path);
    if (match?.[1] && method === 'POST') {
      const revision = revisions.get(match[1]);
      const entry = revision ? courses.get(revision.courseId) : undefined;
      if (!revision || !entry) return json({ error: 'Not found', code: 'NOT_FOUND' }, 404);
      if (revision.status !== 'pending') {
        return json({ error: 'Already decided', code: 'ALREADY_DECIDED' }, 409);
      }
      if (match[2] === 'approve') {
        revision.status = 'approved';
        Object.assign(entry.course, revision.course);
        entry.modules = structuredClone(revision.modules);
      } else {
        revision.status = 'rejected';
        revision.reason = (body as { reason: string }).reason;
      }
      return noContent();
    }

    match = /^\/courses\/([^/]+)\/authoring$/.exec(path);
    if (match?.[1] && courses.has(match[1])) return json(view(match[1]));

    match = /^\/courses\/([^/]+)$/.exec(path);
    if (match?.[1] && courses.has(match[1])) {
      const entry = courses.get(match[1]);
      if (entry && method === 'PATCH') Object.assign(entry.course, body);
      return json(method === 'PATCH' ? entry?.course : view(match[1])?.course);
    }

    match = /^\/courses\/([^/]+)\/submit$/.exec(path);
    if (match?.[1] && courses.has(match[1])) {
      const entry = courses.get(match[1]);
      if (entry) entry.course.status = 'pending_review';
      return noContent();
    }

    match = /^\/courses\/([^/]+)\/modules$/.exec(path);
    if (match?.[1] && method === 'POST') {
      const entry = courses.get(match[1]);
      const input = body as { title: string };
      const module = {
        id: uuid(),
        title: input.title,
        description: '',
        position: entry?.modules.length ?? 0,
        items: [],
      };
      entry?.modules.push(module);
      return json({ id: module.id, title: module.title, description: '', position: 0 }, 201);
    }

    match = /^\/courses\/([^/]+)\/modules\/order$/.exec(path);
    if (match?.[1] && method === 'PUT') {
      const entry = courses.get(match[1]);
      const { moduleIds } = body as { moduleIds: string[] };
      entry?.modules.sort((a, b) => moduleIds.indexOf(a.id) - moduleIds.indexOf(b.id));
      return noContent();
    }

    match = /^\/modules\/([^/]+)\/items$/.exec(path);
    if (match?.[1] && method === 'POST') {
      const module = findModule(match[1]);
      const input = body as { type: Item['type']; title: string };
      const item: Item = {
        id: uuid(),
        type: input.type,
        title: input.title,
        position: module?.items.length ?? 0,
        youtubeVideoId: null,
        youtubeTitle: null,
        isAvailable: null,
        fileKey: null,
        sizeBytes: null,
        pageCount: null,
        instructions: input.type === 'exam' ? '' : null,
        passingScorePercent: input.type === 'exam' ? 60 : null,
        maxAttempts: null,
        timeLimitMinutes: null,
        ...(input.type === 'exam' ? { questions: [] } : {}),
      };
      module?.items.push(item);
      return json(
        { id: item.id, type: item.type, title: item.title, position: item.position },
        201,
      );
    }

    match = /^\/items\/([^/]+)\/questions$/.exec(path);
    if (match?.[1] && method === 'PUT') {
      const item = findItem(match[1]);
      const { questions } = body as {
        questions: (Omit<Question, 'id' | 'position' | 'choices'> & {
          id?: string;
          choices: (Omit<Choice, 'id'> & { id?: string })[];
        })[];
      };
      if (item) {
        item.questions = questions.map((question, position) => ({
          ...question,
          id: question.id ?? uuid(),
          position,
          choices: question.choices.map((choice) => ({ ...choice, id: choice.id ?? uuid() })),
        }));
      }
      return noContent();
    }

    match = /^\/items\/([^/]+)$/.exec(path);
    if (match?.[1] && method === 'PATCH') {
      Object.assign(findItem(match[1]) ?? {}, body);
      return noContent();
    }

    return route.fallback();
  };

  await page.route('**/api/**', handle);
  return { writes };
}
