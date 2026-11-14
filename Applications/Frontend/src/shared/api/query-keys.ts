/**
 * Query keys: one factory per feature area, all here so a mutation in one feature can invalidate
 * another's data (enrolling updates the catalog and "my learning") without importing it.
 *
 * Keys are hierarchical: invalidating a prefix (e.g. `courseKeys.all`) covers everything under
 * it. Mutations invalidate by these keys, never by an ad-hoc refetch.
 */

type Filters = Readonly<Record<string, unknown>>;

export const meKeys = {
  /** GET /me: the signed-in user's profile. */
  me: ['me'] as const,
};

export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  /** GET /courses (catalog) with its filters (search, category, language, page). */
  list: (filters: Filters) => [...courseKeys.lists(), filters] as const,
  categories: () => [...courseKeys.all, 'categories'] as const,
  /** GET /courses/:id (learner-safe detail). */
  detail: (courseId: string) => [...courseKeys.all, courseId] as const,
  /** GET /courses/:id/reviews (pages of learner reviews). */
  reviews: (courseId: string) => [...courseKeys.detail(courseId), 'reviews'] as const,
};

/** Owner/admin authoring data. Kept apart from `courses`: it holds exam answers (short gcTime). */
export const authoringKeys = {
  all: ['authoring'] as const,
  /** GET /courses/:id/authoring (full tree, including correct answers). */
  course: (courseId: string) => [...authoringKeys.all, courseId] as const,
  /** GET /courses/:id/revision (a published course's pending changes, with answers). */
  revision: (courseId: string) => [...authoringKeys.course(courseId), 'revision'] as const,
};

export const myCourseKeys = {
  all: ['my-courses'] as const,
  /** GET /me/courses (courses I own). */
  list: (filters: Filters = {}) => [...myCourseKeys.all, 'list', filters] as const,
};

export const enrollmentKeys = {
  all: ['enrollments'] as const,
  /** GET /me/enrollments with progress. */
  list: () => [...enrollmentKeys.all, 'list'] as const,
};

export const learningKeys = {
  all: ['learning'] as const,
  video: (itemId: string) => [...learningKeys.all, 'video', itemId] as const,
  pdf: (itemId: string) => [...learningKeys.all, 'pdf', itemId] as const,
};

export const examKeys = {
  all: ['exams'] as const,
  /** GET /exams/:id (overview: instructions, passing score, attempts left). */
  detail: (examId: string) => [...examKeys.all, examId] as const,
  attempts: (examId: string) => [...examKeys.detail(examId), 'attempts'] as const,
};

export const adminKeys = {
  all: ['admin'] as const,
  users: {
    all: () => [...adminKeys.all, 'users'] as const,
    list: (filters: Filters) => [...adminKeys.users.all(), 'list', filters] as const,
    detail: (userId: string) => [...adminKeys.users.all(), userId] as const,
  },
  courses: {
    all: () => [...adminKeys.all, 'courses'] as const,
    list: (filters: Filters) => [...adminKeys.courses.all(), 'list', filters] as const,
    detail: (courseId: string) => [...adminKeys.courses.all(), courseId] as const,
    enrollments: (courseId: string, filters: Filters = {}) =>
      [...adminKeys.courses.detail(courseId), 'enrollments', filters] as const,
  },
  moderation: {
    all: () => [...adminKeys.all, 'moderation'] as const,
    list: (filters: Filters = {}) => [...adminKeys.moderation.all(), 'list', filters] as const,
    revision: (revisionId: string) =>
      [...adminKeys.moderation.all(), 'revision', revisionId] as const,
  },
  analytics: {
    all: () => [...adminKeys.all, 'analytics'] as const,
    overview: () => [...adminKeys.analytics.all(), 'overview'] as const,
    enrollments: (range: Filters) => [...adminKeys.analytics.all(), 'enrollments', range] as const,
    courses: (filters: Filters = {}) => [...adminKeys.analytics.all(), 'courses', filters] as const,
    course: (courseId: string) => [...adminKeys.analytics.all(), 'course', courseId] as const,
  },
  videos: {
    unavailable: (filters: Filters = {}) =>
      [...adminKeys.all, 'videos', 'unavailable', filters] as const,
  },
};
