import type { Page } from '@playwright/test';

/** The signed-out catalog (GET /api/public/...) for the guest home page. */
export async function mockPublicCatalog(page: Page) {
  const course = (id: string, title: string, language: 'en' | 'am') => ({
    id,
    title,
    description: '',
    category: 'Safety',
    language,
    thumbnailUrl: null,
    level: 'beginner',
    estimatedDurationMinutes: 90,
    publishedAt: '2026-11-01T08:00:00.000Z',
    ownerName: 'Almaz B.',
    moduleCount: 3,
    enrollmentCount: 12,
    ratingAverage: 4.5,
    ratingCount: 8,
  });
  await page.route('**/api/public/courses?*', (route) =>
    route.fulfill({
      json: {
        page: 1,
        pageSize: 4,
        total: 2,
        items: [course('c1', 'Workplace safety basics', 'en'), course('c2', 'የሥራ ቦታ ደህንነት', 'am')],
      },
    }),
  );
  await page.route('**/api/public/courses/categories', (route) =>
    route.fulfill({
      json: { items: ['Safety'], categories: [{ name: 'Safety', courseCount: 2 }] },
    }),
  );
}
