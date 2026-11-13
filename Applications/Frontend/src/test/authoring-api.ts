import { http, HttpResponse } from 'msw';
import { authoringFixture } from './fixtures';
import { api, server } from './msw';

/** Loose shapes: the mock edits the fixture in place. */
interface Item {
  id: string;
  type: string;
  title: string;
  questions?: unknown[];
  [field: string]: unknown;
}
interface Module {
  id: string;
  title: string;
  description: string;
  position: number;
  items: Item[];
}
interface View {
  course: { status: string; [field: string]: unknown };
  modules: Module[];
}

export interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
}

/**
 * A stateful mock of the authoring endpoints for course-1 (the editor's granular saves):
 * changes are applied to `state`, so refetches show them, and every write is recorded.
 * `failNext(method, pathPattern, response)` makes the next matching write fail.
 */
export function mockAuthoringApi(initial: object = authoringFixture()) {
  const state = structuredClone(initial) as View;
  const requests: RecordedRequest[] = [];
  const failures: { method: string; pattern: RegExp; response: () => Response }[] = [];
  let counter = 0;
  const nextId = (prefix: string) => {
    counter += 1;
    return `${prefix}-new-${String(counter)}`;
  };

  const record = async (request: Request): Promise<Response | null> => {
    const path = new URL(request.url).pathname.replace(/^\/api/, '');
    const text = await request.clone().text();
    const body = text ? (JSON.parse(text) as unknown) : undefined;
    requests.push({ method: request.method, path, body });
    const index = failures.findIndex(
      (failure) => failure.method === request.method && failure.pattern.test(path),
    );
    if (index >= 0) {
      const [failure] = failures.splice(index, 1);
      return failure ? failure.response() : null;
    }
    return null;
  };

  const findModule = (id: string) => state.modules.find((module) => module.id === id);
  const findItem = (id: string) =>
    state.modules.flatMap((module) => module.items).find((item) => item.id === id);

  server.use(
    http.get(api('/courses/course-1/authoring'), () => HttpResponse.json(state)),
    http.patch(api('/courses/course-1'), async ({ request }) => {
      const failed = await record(request);
      if (failed) return failed;
      Object.assign(state.course, await request.json());
      return HttpResponse.json(state.course);
    }),
    http.post(api('/courses/course-1/submit'), async ({ request }) => {
      const failed = await record(request);
      if (failed) return failed;
      state.course.status = 'pending_review';
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(api('/courses/course-1/modules'), async ({ request }) => {
      const failed = await record(request);
      if (failed) return failed;
      const input = (await request.json()) as { title: string };
      const module = {
        id: nextId('module'),
        title: input.title,
        description: '',
        position: state.modules.length,
        items: [] as Item[],
      };
      state.modules.push(module);
      return HttpResponse.json(
        { id: module.id, title: module.title, description: '', position: module.position },
        { status: 201 },
      );
    }),
    http.put(api('/courses/course-1/modules/order'), async ({ request }) => {
      const failed = await record(request);
      if (failed) return failed;
      const { moduleIds } = (await request.json()) as { moduleIds: string[] };
      state.modules.sort((a, b) => moduleIds.indexOf(a.id) - moduleIds.indexOf(b.id));
      return new HttpResponse(null, { status: 204 });
    }),
    http.patch(api('/modules/:moduleId'), async ({ request, params }) => {
      const failed = await record(request);
      if (failed) return failed;
      Object.assign(findModule(String(params.moduleId)) ?? {}, await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete(api('/modules/:moduleId'), async ({ request, params }) => {
      const failed = await record(request);
      if (failed) return failed;
      state.modules = state.modules.filter((module) => module.id !== params.moduleId);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(api('/modules/:moduleId/items'), async ({ request, params }) => {
      const failed = await record(request);
      if (failed) return failed;
      const module = findModule(String(params.moduleId));
      const input = (await request.json()) as { type: 'video' | 'pdf' | 'exam'; title: string };
      const item = {
        id: nextId('item'),
        type: input.type,
        title: input.title,
        position: module?.items.length ?? 0,
        youtubeVideoId: input.type === 'video' ? 'zyxwvutsrqp' : null,
        youtubeTitle: input.type === 'video' ? 'Verified title' : null,
        isAvailable: input.type === 'video' ? true : null,
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
      return HttpResponse.json(
        { id: item.id, type: item.type, title: item.title, position: item.position },
        { status: 201 },
      );
    }),
    http.put(api('/modules/:moduleId/items/order'), async ({ request, params }) => {
      const failed = await record(request);
      if (failed) return failed;
      const { itemIds } = (await request.json()) as { itemIds: string[] };
      findModule(String(params.moduleId))?.items.sort(
        (a, b) => itemIds.indexOf(a.id) - itemIds.indexOf(b.id),
      );
      return new HttpResponse(null, { status: 204 });
    }),
    http.patch(api('/items/:itemId'), async ({ request, params }) => {
      const failed = await record(request);
      if (failed) return failed;
      Object.assign(findItem(String(params.itemId)) ?? {}, await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete(api('/items/:itemId'), async ({ request, params }) => {
      const failed = await record(request);
      if (failed) return failed;
      for (const module of state.modules) {
        module.items = module.items.filter((item) => item.id !== params.itemId);
      }
      return new HttpResponse(null, { status: 204 });
    }),
    http.put(api('/items/:itemId/questions'), async ({ request, params }) => {
      const failed = await record(request);
      if (failed) return failed;
      const { questions } = (await request.json()) as {
        questions: {
          id?: string;
          prompt: string;
          isMultiple: boolean;
          points: number;
          choices: { id?: string; text: string; isCorrect: boolean }[];
        }[];
      };
      const item = findItem(String(params.itemId));
      if (item) {
        item.questions = questions.map((question, position) => ({
          ...question,
          id: question.id ?? nextId('q'),
          position,
          choices: question.choices.map((choice) => ({ ...choice, id: choice.id ?? nextId('c') })),
        }));
      }
      return new HttpResponse(null, { status: 204 });
    }),
  );

  return {
    state,
    requests,
    /** Writes matching method + path (after /api), in order. */
    writes: (method: string, pattern: RegExp) =>
      requests.filter((entry) => entry.method === method && pattern.test(entry.path)),
    failNext: (method: string, pattern: RegExp, response: () => Response) => {
      failures.push({ method, pattern, response });
    },
  };
}
