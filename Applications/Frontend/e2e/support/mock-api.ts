import type { Page, Route } from '@playwright/test';

/**
 * A small in-memory backend for e2e tests: answers /api/* from fixtures and keeps enrollment
 * state, so flows (enroll, then continue) behave like the real API. The bearer token is the
 * real emulator token; it is not checked here.
 */

export interface MockUser {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  createdAt: string;
}

export const learner = (email: string, overrides: Partial<MockUser> = {}): MockUser => ({
  id: 'user-1',
  email,
  name: 'Abebe Kebede',
  role: 'user',
  status: 'active',
  createdAt: '2026-11-13T09:30:00.000Z',
  ...overrides,
});

export const course = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  ownerId: 'owner-1',
  title: 'Workplace safety basics',
  description:
    'Hazards, protective equipment and what to do in an emergency.\n\nFor everyone on site.',
  category: 'Safety',
  language: 'en',
  thumbnailUrl: null,
  tags: [],
  estimatedDurationMinutes: 90,
  status: 'published',
  rejectionReason: null,
  createdAt: '2026-10-01T08:00:00.000Z',
  publishedAt: '2026-10-05T08:00:00.000Z',
  ownerName: 'Selam Tesfaye',
  enrolled: false,
  moduleCount: 2,
  enrollmentCount: 14,
  ...overrides,
});

export const sampleCourses = [
  course('course-1'),
  course('course-2', {
    title: 'የሥራ ቦታ ደህንነት መሠረታዊ ነገሮች',
    description: 'አደጋዎች፣ የመከላከያ መሣሪያዎች እና በአደጋ ጊዜ ምን ማድረግ እንዳለብዎ።',
    language: 'am',
    category: 'Safety',
    ownerName: 'ሰላም ተስፋዬ',
  }),
  course('course-3', {
    title: 'Leading a team through change: a practical guide for new supervisors',
    category: 'Leadership',
    estimatedDurationMinutes: 45,
    enrollmentCount: 1,
  }),
];

const outline = [
  {
    id: 'module-1',
    title: 'Getting started',
    description: 'Why safety matters.',
    position: 0,
    items: [
      { id: 'item-1', type: 'video', title: 'Welcome' },
      { id: 'item-2', type: 'pdf', title: 'Safety handbook' },
    ],
  },
  {
    id: 'module-2',
    title: 'Check your knowledge',
    description: '',
    position: 1,
    items: [{ id: 'item-3', type: 'exam', title: 'Final quiz' }],
  },
];

export interface MockApi {
  /** Request paths (with query strings) received so far. */
  requests: string[];
  /** Bodies of PUT /items/:id/progress, in order. */
  progress: { itemId: string; body: unknown }[];
}

/** A valid PDF with `pages` pages, each showing "Page N" (for the real pdf.js viewer). */
export function makePdf(pages: number): Buffer {
  const objects: string[] = [];
  const pageIds = Array.from({ length: pages }, (_, index) => 4 + index * 2);
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${String(id)} 0 R`).join(' ')}] /Count ${String(pages)} >>`,
  );
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  for (let page = 1; page <= pages; page += 1) {
    const content = `BT /F1 36 Tf 72 700 Td (Page ${String(page)}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${String(5 + (page - 1) * 2)} 0 R >>`,
    );
    objects.push(`<< /Length ${String(content.length)} >>\nstream\n${content}\nendstream`);
  }
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${String(index + 1)} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${String(objects.length + 1)} /Root 1 0 R >>\nstartxref\n${String(xref)}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

export async function mockApi(page: Page, me: MockUser): Promise<MockApi> {
  const enrolled = new Set<string>();
  const requests: string[] = [];
  const progress: MockApi['progress'] = [];
  const completedItems = new Set<string>();
  const withState = (c: ReturnType<typeof course>) => ({ ...c, enrolled: enrolled.has(c.id) });

  const handle = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = request.method();
    requests.push(`${method} ${path}${url.search}`);
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });

    if (path === '/me') return json(me);
    if (path === '/courses/categories') return json({ items: ['Leadership', 'Safety'] });
    if (path === '/courses' && method === 'GET') {
      const q = url.searchParams.get('q')?.toLowerCase();
      const language = url.searchParams.get('language');
      const category = url.searchParams.get('category');
      const items = sampleCourses
        .filter((c) => !q || c.title.toLowerCase().includes(q))
        .filter((c) => !language || c.language === language)
        .filter((c) => !category || c.category === category)
        .map(withState);
      return json({ page: 1, pageSize: 12, total: items.length, items });
    }
    const enrollMatch = /^\/courses\/([^/]+)\/enroll$/.exec(path);
    if (enrollMatch?.[1]) {
      if (method === 'POST') enrolled.add(enrollMatch[1]);
      else enrolled.delete(enrollMatch[1]);
      return method === 'POST' ? json({ enrolled: true }, 201) : route.fulfill({ status: 204 });
    }
    const detailMatch = /^\/courses\/([^/]+)$/.exec(path);
    if (detailMatch?.[1]) {
      const found = sampleCourses.find((c) => c.id === detailMatch[1]);
      if (!found) return json({ error: 'Course not found', code: 'NOT_FOUND' }, 404);
      return json({
        ...withState(found),
        modules: outline,
        completedItemIds: [...completedItems],
        pendingRevision: null,
      });
    }
    if (path === '/items/item-1/video') {
      // Unavailable: keeps the e2e run off the real YouTube network.
      return json({
        youtubeVideoId: 'abcdefghijk',
        youtubeTitle: null,
        isAvailable: false,
        lastPositionSeconds: 0,
        completed: false,
      });
    }
    if (path === '/items/item-2/pdf') {
      return route.fulfill({ status: 200, contentType: 'application/pdf', body: makePdf(3) });
    }
    const progressMatch = /^\/items\/([^/]+)\/progress$/.exec(path);
    if (progressMatch?.[1] && method === 'PUT') {
      const body: unknown = request.postDataJSON();
      progress.push({ itemId: progressMatch[1], body });
      if ((body as { completed?: boolean }).completed) completedItems.add(progressMatch[1]);
      return route.fulfill({ status: 204 });
    }
    if (path === '/me/enrollments') {
      return json(
        sampleCourses
          .filter((c) => enrolled.has(c.id))
          .map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            category: c.category,
            language: c.language,
            thumbnailUrl: c.thumbnailUrl,
            enrolledAt: '2026-11-12T08:00:00.000Z',
            progressPercent: 0,
          })),
      );
    }
    return json({ error: 'Not mocked', code: 'NOT_FOUND' }, 404);
  };

  await page.route('**/api/**', handle);
  return { requests, progress };
}
