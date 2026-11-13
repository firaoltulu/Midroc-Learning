import type { Me } from '../features/auth';

/** Test data in the backend's response shapes. Override only what a test cares about. */

export const meFixture = (overrides: Partial<Me> = {}): Me => ({
  id: 'user-1',
  email: 'learner@example.com',
  name: 'Abebe Kebede',
  role: 'user',
  status: 'active',
  createdAt: '2026-11-01T09:30:00.000Z',
  ...overrides,
});

export const adminFixture = (overrides: Partial<Me> = {}): Me =>
  meFixture({
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'admin',
    ...overrides,
  });

/** The `{ page, pageSize, total, items }` envelope of list endpoints. */
export const pageOf = <T>(
  items: T[],
  overrides: { page?: number; pageSize?: number; total?: number } = {},
) => ({
  page: 1,
  pageSize: 20,
  total: items.length,
  items,
  ...overrides,
});

/** A published catalog course (reference/openapi.yaml: CatalogCourse). */
export const courseFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'course-1',
  ownerId: 'owner-1',
  title: 'Workplace safety basics',
  description: 'Hazards, protective equipment and what to do in an emergency.',
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

/** Course detail with two modules and three items (reference/openapi.yaml: CourseDetail). */
export const courseDetailFixture = (overrides: Record<string, unknown> = {}) => ({
  ...courseFixture(),
  modules: [
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
  ],
  completedItemIds: [],
  pendingRevision: null,
  ...overrides,
});

/** An authoring item with every type's fields null (reference/openapi.yaml: AuthoringItem). */
const authoringItem = (overrides: Record<string, unknown>) => ({
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
  ...overrides,
});

/**
 * The owner's authoring view of a draft course: two modules, a video, a PDF and an exam with
 * one question (reference/openapi.yaml: AuthoringView).
 */
export const authoringFixture = (courseOverrides: Record<string, unknown> = {}) => ({
  course: courseDetailFixture({
    ownerId: 'user-1',
    status: 'draft',
    publishedAt: null,
    description: '',
    tags: ['safety'],
    ...courseOverrides,
  }),
  modules: [
    {
      id: 'module-1',
      title: 'Getting started',
      description: 'Why safety matters.',
      position: 0,
      items: [
        authoringItem({
          id: 'item-1',
          type: 'video',
          title: 'Welcome',
          position: 0,
          youtubeVideoId: 'abcdefghijk',
          youtubeTitle: 'Welcome to safety',
          isAvailable: true,
        }),
        authoringItem({
          id: 'item-2',
          type: 'pdf',
          title: 'Safety handbook',
          position: 1,
          fileKey: '3f6c1a2b-4d5e-4f60-8a1b-2c3d4e5f6a7b.pdf',
          sizeBytes: 2_516_582,
          pageCount: 12,
        }),
      ],
    },
    {
      id: 'module-2',
      title: 'Check your knowledge',
      description: '',
      position: 1,
      items: [
        authoringItem({
          id: 'item-3',
          type: 'exam',
          title: 'Final quiz',
          position: 0,
          instructions: 'Answer every question.',
          passingScorePercent: 70,
          maxAttempts: 3,
          timeLimitMinutes: null,
          questions: [
            {
              id: 'q1',
              prompt: 'What do you wear on a construction site?',
              isMultiple: false,
              points: 1,
              position: 0,
              choices: [
                { id: 'c1', text: 'A hard hat', isCorrect: true },
                { id: 'c2', text: 'Sandals', isCorrect: false },
              ],
            },
          ],
        }),
      ],
    },
  ],
});
