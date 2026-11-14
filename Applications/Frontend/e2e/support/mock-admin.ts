import type { Page, Route } from '@playwright/test';

/**
 * Read-only admin endpoints for e2e (dashboard, courses with analytics and enrollments, users,
 * videos). Moderation lives in mock-authoring. Register after mockApi/mockAuthoring.
 */
const user = (id: string, email: string, name: string | null, overrides = {}) => ({
  id,
  email,
  name,
  role: 'user',
  status: 'active',
  createdAt: '2026-10-01T09:00:00.000Z',
  ...overrides,
});

const users = [
  user('user-2', 'sara@example.com', 'Sara Tesfaye'),
  user('user-3', 'dawit@example.com', null, { status: 'suspended' }),
  user('admin-2', 'meron@example.com', 'Meron Alemu', { role: 'admin' }),
];

const adminCourse = {
  id: 'course-1',
  ownerId: 'owner-1',
  title: 'Workplace safety basics',
  description: 'Hazards, protective equipment and what to do in an emergency.',
  category: 'Safety',
  language: 'en',
  thumbnailUrl: null,
  tags: [],
  estimatedDurationMinutes: 90,
  level: 'beginner',
  outcomes: [],
  skills: [],
  status: 'published',
  rejectionReason: null,
  createdAt: '2026-10-01T08:00:00.000Z',
  publishedAt: '2026-10-05T08:00:00.000Z',
  ownerName: 'Selam Tesfaye',
  ownerEmail: 'selam@example.com',
  updatedAt: '2026-11-10T08:00:00.000Z',
  enrollmentCount: 14,
};

export async function mockAdmin(page: Page) {
  const handle = (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, '');
    const json = (body: unknown) => route.fulfill({ json: body });
    const page1 = <T>(items: T[]) => ({ page: 1, pageSize: 20, total: items.length, items });

    if (path === '/admin/analytics/overview') {
      return json({
        userCount: 42,
        courseCount: 9,
        publishedCourseCount: 5,
        enrollmentCount: 120,
        submittedAttemptCount: 30,
        averageExamScore: 71.5,
        examPassRate: 62.5,
        enrollmentsLast30Days: 18,
        activeLearnerCount: 11,
        pendingRevisionCount: 1,
        coursesByStatus: { draft: 2, pending_review: 1, published: 5, rejected: 1, archived: 0 },
      });
    }
    if (path === '/admin/analytics/enrollments') {
      const days = Array.from({ length: 30 }, (_, index) => ({
        date: new Date(Date.UTC(2026, 9, 16 + index)).toISOString(),
        count: (index * 7) % 5,
      }));
      return json(days);
    }
    if (path === '/admin/analytics/courses') {
      return json([
        {
          id: 'course-1',
          title: adminCourse.title,
          status: 'published',
          enrollmentCount: 14,
          completedCount: 4,
          completionRate: 28.57,
        },
      ]);
    }
    if (path === '/admin/analytics/courses/course-1') {
      return json({
        id: 'course-1',
        title: adminCourse.title,
        status: 'published',
        enrollmentCount: 14,
        itemCount: 3,
        completedItemCount: 3,
        submittedAttemptCount: 9,
        averageExamScore: 74,
        examPassRate: 66.67,
        completedEnrollmentCount: 4,
        completionRate: 28.57,
        progressDistribution: [
          { min: 0, max: 0, count: 3 },
          { min: 1, max: 24, count: 2 },
          { min: 25, max: 49, count: 2 },
          { min: 50, max: 74, count: 2 },
          { min: 75, max: 99, count: 1 },
          { min: 100, max: 100, count: 4 },
        ],
        items: [
          {
            id: 'item-1',
            type: 'video',
            title: 'Welcome',
            moduleId: 'module-1',
            moduleTitle: 'Getting started',
            completedCount: 10,
            submittedAttemptCount: null,
            passRate: null,
            averageScore: null,
          },
          {
            id: 'item-3',
            type: 'exam',
            title: 'Final quiz',
            moduleId: 'module-2',
            moduleTitle: 'Check your knowledge',
            completedCount: 6,
            submittedAttemptCount: 9,
            passRate: 66.67,
            averageScore: 74,
          },
        ],
      });
    }
    if (path === '/admin/courses/course-1/enrollments') {
      return json(
        page1([
          {
            userId: 'user-2',
            email: 'sara@example.com',
            name: 'Sara Tesfaye',
            enrolledAt: '2026-11-01T09:00:00.000Z',
            itemCount: 3,
            completedItemCount: 2,
            progressPercent: 67,
            lastActivityAt: '2026-11-13T09:00:00.000Z',
          },
        ]),
      );
    }
    if (path === '/admin/courses') return json(page1([adminCourse]));
    if (path === '/admin/users') return json(page1(users));
    const userMatch = /^\/admin\/users\/([^/]+)$/.exec(path);
    if (userMatch) return json(users.find((entry) => entry.id === userMatch[1]) ?? users[0]);
    if (path === '/admin/videos/unavailable') {
      return json([
        {
          itemId: 'item-1',
          itemTitle: 'Welcome',
          youtubeTitle: 'Welcome to safety',
          lastCheckedAt: '2026-11-13T09:00:00.000Z',
          courseId: 'course-1',
          courseTitle: adminCourse.title,
          ownerId: 'owner-1',
          ownerName: 'Selam Tesfaye',
          ownerEmail: 'selam@example.com',
        },
      ]);
    }
    return route.fallback();
  };
  await page.route('**/api/admin/**', handle);
}
