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

export async function mockAuthoring(page: Page, ownerId: string): Promise<MockAuthoring> {
  const writes: MockAuthoring['writes'] = [];
  const courses = new Map<string, { course: Record<string, unknown>; modules: Module[] }>();
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
          pendingRevision: null,
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

    let match = /^\/courses\/([^/]+)\/authoring$/.exec(path);
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
