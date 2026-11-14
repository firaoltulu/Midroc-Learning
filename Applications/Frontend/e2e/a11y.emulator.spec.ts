import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  expectAccessible,
  LANGUAGES,
  SCHEMES,
  settle,
  useSchemeAndLanguage,
  type Language,
  type Scheme,
} from './support/axe';
import { signInAsLearner, uniqueEmail } from './support/emulator';
import { learner, mockApi } from './support/mock-api';
import { mockAdmin } from './support/mock-admin';
import { mockAuthoring, type SeedCourse } from './support/mock-authoring';

/**
 * axe (WCAG 2.2 A/AA, serious and critical fail) on the key signed-in pages, in both color
 * schemes and both languages: learner pages, the editor, and the admin area. Signed in for
 * real against the Auth emulator; the API is mocked. Run with `npm run e2e:emulator`.
 */

test.describe.configure({ timeout: 120_000 });

const seed = (id: string, status: string): SeedCourse => ({
  course: {
    id,
    ownerId: 'user-1',
    title: status === 'published' ? 'Ladder safety' : 'Fire safety',
    description: 'Set up and climb ladders safely.',
    category: 'Safety',
    language: 'en',
    thumbnailUrl: null,
    tags: ['ladders'],
    estimatedDurationMinutes: 30,
    level: null,
    outcomes: [],
    skills: [],
    status,
    rejectionReason: null,
    createdAt: '2026-11-10T10:00:00.000Z',
    publishedAt: status === 'published' ? '2026-11-11T10:00:00.000Z' : null,
    ownerName: 'Abebe Kebede',
    enrolled: false,
    enrollmentCount: 0,
    completedItemIds: [],
    pendingRevision: null,
  },
  modules: [
    {
      id: `${id}-m1`,
      title: 'Basics',
      description: 'Before you climb.',
      position: 0,
      items: [
        {
          id: `${id}-i1`,
          type: 'exam',
          title: 'Basics quiz',
          position: 0,
          youtubeVideoId: null,
          youtubeTitle: null,
          isAvailable: null,
          fileKey: null,
          sizeBytes: null,
          pageCount: null,
          instructions: 'Answer the question.',
          passingScorePercent: 60,
          maxAttempts: null,
          timeLimitMinutes: null,
          questions: [
            {
              id: `${id}-q1`,
              prompt: 'Check the feet before climbing?',
              isMultiple: false,
              points: 1,
              position: 0,
              choices: [
                { id: `${id}-a`, text: 'Yes', isCorrect: true },
                { id: `${id}-b`, text: 'No', isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
  ],
});

async function check(
  page: Page,
  testInfo: TestInfo,
  scheme: Scheme,
  language: Language,
  paths: string[],
) {
  for (const path of paths) {
    await page.goto(path);
    await settle(page, scheme, language);
    await expectAccessible(page, testInfo, `${path} ${scheme} ${language}`);
  }
}

for (const scheme of SCHEMES) {
  for (const language of LANGUAGES) {
    test(`learner pages and the editor (${scheme}, ${language})`, async ({ page }, testInfo) => {
      const email = uniqueEmail('a11y-learner');
      await mockApi(page, learner(email));
      await mockAuthoring(page, 'user-1', {
        seed: [seed('course-draft', 'draft'), seed('course-live', 'published')],
      });
      await signInAsLearner(page, email);
      await useSchemeAndLanguage(page, scheme, language);

      // Enrolled, so the player and My learning have content.
      await page.goto('/courses/course-1');
      await settle(page, scheme, language);
      await page.getByRole('complementary').getByRole('button').first().click();
      await expect(page.getByRole('complementary').getByRole('link').first()).toBeVisible();

      await check(page, testInfo, scheme, language, [
        // Home with the "Continue learning" card (enrolled above).
        '/',
        '/courses',
        '/courses/course-1',
        '/learn',
        '/learn/course-1/item-2',
        '/learn/course-1/item-3',
        '/my-courses',
        '/my-courses/course-draft/edit',
        '/my-courses/course-draft/edit?tab=%22content%22',
        '/my-courses/course-draft/edit?tab=%22review%22',
        '/my-courses/course-live/edit',
        '/account',
      ]);

      // An exam in progress, and a dialog.
      await page.goto('/learn/course-1/item-3');
      await settle(page, scheme, language);
      await page
        .getByRole('button', { name: language === 'en' ? 'Start exam' : 'ፈተናውን ይጀምሩ' })
        .click();
      await expect(page.getByTestId('exam-clock')).toBeVisible();
      await expectAccessible(page, testInfo, `exam in progress ${scheme} ${language}`);
    });

    test(`admin pages (${scheme}, ${language})`, async ({ page }, testInfo) => {
      const email = uniqueEmail('a11y-admin');
      await mockApi(page, learner(email, { id: 'admin-1', name: 'Admin', role: 'admin' }));
      await mockAuthoring(page, 'user-1', {
        seed: [seed('course-pending', 'pending_review'), seed('course-live', 'published')],
      });
      await mockAdmin(page);
      await signInAsLearner(page, email);
      await useSchemeAndLanguage(page, scheme, language);
      // A pending revision to review (the owner's working copy submission).
      await page.evaluate(async () => {
        await fetch('/api/courses/course-live/revision', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            course: {
              title: 'Ladder safety at work',
              description: 'Set up and climb ladders safely.',
              category: 'Safety',
              language: 'en',
            },
            modules: [{ id: 'course-live-m1', title: 'Basics', description: '', items: [] }],
          }),
        });
      });

      await check(page, testInfo, scheme, language, [
        '/admin',
        '/admin/moderation',
        '/admin/moderation?tab=%22revisions%22',
        '/admin/moderation/courses/course-pending',
        '/admin/courses',
        '/admin/courses/course-1',
        '/admin/users',
        '/admin/users/user-2',
        '/admin/videos',
      ]);
      await page.goto('/admin/moderation?tab=%22revisions%22');
      await settle(page, scheme, language);
      await page.getByRole('table').getByRole('link').first().click();
      await settle(page, scheme, language);
      await expectAccessible(page, testInfo, `revision review ${scheme} ${language}`);
      // Reject without a reason: the reason box on the page shows its error and takes focus.
      await page
        .getByRole('button', { name: language === 'en' ? 'Reject changes' : 'ለውጦቹን ውድቅ ያድርጉ' })
        .click();
      const reason = page.getByRole('textbox', {
        name: language === 'en' ? 'Reason (required to reject)' : 'ምክንያት (ውድቅ ለማድረግ ያስፈልጋል)',
      });
      await expect(reason).toHaveAttribute('aria-invalid', 'true');
      await expect(reason).toBeFocused();
      await expectAccessible(page, testInfo, `reject reason ${scheme} ${language}`);
    });
  }
}
