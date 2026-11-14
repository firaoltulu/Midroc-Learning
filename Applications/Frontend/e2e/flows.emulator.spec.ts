import { expect, test, type Page } from '@playwright/test';
import { signInAsLearner, uniqueEmail } from './support/emulator';
import { learner, mockApi } from './support/mock-api';
import { mockAuthoring, type SeedCourse } from './support/mock-authoring';
import { mockIdentity } from './support/mock-identity';
import { fakeYouTube, youtube } from './support/youtube-fake';

/**
 * The six end-to-end flows of the spec (section 12), on the production build. People sign
 * in for real against the Firebase Auth emulator; the REST API is mocked in memory
 * (page.route, see e2e/support). Run with `npm run e2e:emulator`; docs/e2e.md explains how to
 * walk the same flows against the real backend.
 */

const OWNER_ID = 'user-1';

async function signOut(page: Page, name: string) {
  await page.getByRole('button', { name: `Account menu for ${name}` }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
}

/** An exam item as the authoring view returns it. */
const examItem = (id: string, title: string) => ({
  id,
  type: 'exam' as const,
  title,
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
        { id: `${id}-q1-a`, text: 'Yes', isCorrect: true },
        { id: `${id}-q1-b`, text: 'No', isCorrect: false },
      ],
    },
  ],
});

/** A course of the owner, in the given status, with one module holding one exam. */
function ownedCourse(id: string, title: string, status: string): SeedCourse {
  return {
    course: {
      id,
      ownerId: OWNER_ID,
      title,
      description: 'Set up and climb ladders safely.',
      category: 'Safety',
      language: 'en',
      thumbnailUrl: null,
      tags: [],
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
        description: '',
        position: 0,
        items: [examItem(`${id}-i1`, 'Basics quiz')],
      },
    ],
  };
}

test('1. sign up, verify, browse, enroll and watch a video (progress is saved)', async ({
  page,
}) => {
  const email = uniqueEmail('flow1');
  const api = await mockApi(page, learner(email), { videoAvailable: true });
  await fakeYouTube(page);

  // Sign up and verify (signInAsLearner does both, then lands on the catalog).
  await signInAsLearner(page, email);
  await expect(page.getByRole('heading', { level: 1, name: 'Courses' })).toBeVisible();

  // Browse: search, open the course.
  await page.getByRole('searchbox', { name: 'Search courses' }).fill('workplace');
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
  await page.getByRole('link', { name: 'Workplace safety basics' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Workplace safety basics' }),
  ).toBeFocused();

  // Enroll, then continue to the first item: the video.
  const actions = page.getByRole('complementary', { name: 'Course actions' });
  await actions.getByRole('button', { name: 'Enroll' }).click();
  await actions.getByRole('link', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome' })).toBeFocused();
  await expect(page.frameLocator('iframe[title="Video: Welcome"]').locator('body')).toBeAttached();

  // Watch: pausing saves the position; the end completes the item.
  await youtube(page).play(0);
  await youtube(page).pause(42);
  await expect
    .poll(() => api.progress)
    .toContainEqual({ itemId: 'item-1', body: { lastPositionSeconds: 42 } });
  await youtube(page).play();
  await youtube(page).end();
  await expect
    .poll(() => api.progress.some((entry) => (entry.body as { completed?: boolean }).completed))
    .toBe(true);
  const outline = page.getByRole('complementary', { name: 'Course content' });
  await expect(outline.getByRole('img', { name: 'Completed' })).toHaveCount(1);
});

test('2. take an exam, pass and see the result', async ({ page }) => {
  const email = uniqueEmail('flow2');
  await mockApi(page, learner(email));
  await signInAsLearner(page, email);

  await page.goto('/courses/course-1');
  const actions = page.getByRole('complementary', { name: 'Course actions' });
  await actions.getByRole('button', { name: 'Enroll' }).click();
  await actions.getByRole('link', { name: 'Continue' }).click();
  // In the player, the outline leads to the exam.
  await page
    .getByRole('complementary', { name: 'Course content' })
    .getByRole('link', { name: /Final quiz/ })
    .click();

  await page.getByRole('button', { name: 'Start exam' }).click();
  await page.getByRole('radio', { name: 'A hard hat' }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('checkbox', { name: 'Oily rags' }).check();
  await page.getByRole('checkbox', { name: 'Blocked exits' }).check();
  await page.getByRole('button', { name: 'Review answers' }).click();
  await page.getByRole('button', { name: 'Submit answers' }).click();

  await expect(page.getByRole('heading', { name: 'You passed' })).toBeFocused();
  await expect(page.getByText('100%', { exact: true }).first()).toBeVisible();
});

test('3. create a course, add content and submit it for review', async ({ page }) => {
  const email = uniqueEmail('flow3');
  await mockApi(page, learner(email));
  const authoring = await mockAuthoring(page, OWNER_ID);
  await signInAsLearner(page, email);

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'My courses' })
    .click();
  await page.getByRole('link', { name: 'Create course' }).click();
  await expect(page.getByRole('textbox', { name: 'Course title' })).toBeFocused();
  await page.getByRole('textbox', { name: 'Course title' }).fill('Ladder safety');
  await page.getByRole('button', { name: 'Create course' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ladder safety' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Description' }).fill('Set up and climb ladders safely.');
  await expect(page.getByText('All changes saved')).toBeVisible();

  await page.getByRole('tab', { name: 'Content' }).click();
  await page.getByRole('button', { name: 'Add module' }).last().click();
  const moduleDialog = page.getByRole('dialog', { name: 'Add a module' });
  await moduleDialog.getByRole('textbox', { name: 'Module title' }).fill('Basics');
  await moduleDialog.getByRole('button', { name: 'Add module' }).click();
  await page.getByRole('button', { name: 'Add item' }).first().click();
  const itemDialog = page.getByRole('dialog', { name: /^Add an item to / });
  await itemDialog.getByRole('radio', { name: 'Exam' }).check();
  await itemDialog.getByRole('textbox', { name: 'Item title' }).fill('Basics quiz');
  await itemDialog.getByRole('button', { name: 'Add item' }).click();
  await page.getByRole('button', { name: 'Add question', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Question', exact: true })
    .fill('Check the feet before climbing?');
  await page.getByRole('textbox', { name: 'Answer 1' }).fill('Yes');
  await page.getByRole('textbox', { name: 'Answer 2' }).fill('No');
  await page.getByRole('radio', { name: 'Answer 1 is correct' }).check();
  await expect(page.getByText('All changes saved')).toBeVisible();

  await page.getByRole('tab', { name: 'Review' }).click();
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByText('In review')).toBeVisible();
  expect(authoring.writes.some((write) => write.path.endsWith('/submit'))).toBe(true);
});

test('4. an administrator reviews the submitted course and approves it', async ({ page }) => {
  const adminEmail = uniqueEmail('flow4-admin');
  await mockApi(page, learner(adminEmail, { id: 'admin-1', name: 'Admin', role: 'admin' }));
  await mockAuthoring(page, OWNER_ID, {
    seed: [ownedCourse('course-new', 'Ladder safety', 'pending_review')],
  });
  await signInAsLearner(page, adminEmail);

  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Administration' })
    .click();
  await page
    .getByRole('navigation', { name: 'Administration' })
    .getByRole('link', { name: 'Moderation' })
    .click();
  await page
    .getByRole('table', { name: 'New courses' })
    .getByRole('link', { name: 'Ladder safety' })
    .click();

  // The review shows the content with the exam's correct answer.
  await expect(page.getByRole('heading', { level: 1, name: 'Ladder safety' })).toBeFocused();
  await page.getByText('Show the question and answers (1)').click();
  await expect(page.getByText('(correct answer)')).toBeVisible();

  await page.getByRole('button', { name: 'Approve and publish' }).click();
  const dialog = page.getByRole('dialog', { name: 'Approve and publish this course?' });
  await dialog.getByRole('button', { name: 'Approve and publish' }).click();
  await expect(page.getByRole('heading', { name: 'No courses waiting' })).toBeVisible();

  await page.goto('/courses/course-new');
  await expect(page.getByRole('heading', { level: 1, name: 'Ladder safety' })).toBeVisible();
  await expect(page.getByText('Published', { exact: true }).first()).toBeVisible();
});

test('5. edit a published course, submit the changes, an administrator approves them', async ({
  page,
}) => {
  const ownerEmail = uniqueEmail('flow5-owner');
  const adminEmail = uniqueEmail('flow5-admin');
  await mockApi(page, learner(ownerEmail));
  await mockAuthoring(page, OWNER_ID, {
    ownerEmail,
    seed: [ownedCourse('course-live', 'Ladder safety', 'published')],
  });
  await mockIdentity(page, [
    learner(ownerEmail),
    learner(adminEmail, { id: 'admin-1', name: 'Admin', role: 'admin' }),
  ]);

  // The owner edits the live course in the working copy and submits the changes.
  await signInAsLearner(page, ownerEmail);
  await page.goto('/my-courses/course-live/edit');
  const title = page.getByRole('textbox', { name: 'Course title' });
  await expect(title).toHaveValue('Ladder safety');
  await title.fill('Ladder safety at work');
  const bar = page.getByRole('region', { name: 'Your changes' });
  await expect(bar.getByText('1 change')).toBeVisible();
  await bar.getByRole('button', { name: 'Submit changes for review' }).click();
  await expect(page.getByText(/You have changes waiting for review/)).toBeVisible();
  await signOut(page, 'Abebe Kebede');

  // An administrator reviews the revision: the title from → to, then approves.
  await signInAsLearner(page, adminEmail);
  await page.goto('/admin/moderation?tab=%22revisions%22');
  await page
    .getByRole('table', { name: 'Changes to published courses' })
    .getByRole('link', { name: 'Ladder safety' })
    .click();
  const details = page.getByRole('region', { name: 'Course details' });
  await expect(details.locator('[data-tone="removed"]')).toContainText('Ladder safety');
  await expect(details.locator('[data-tone="added"]')).toContainText('Ladder safety at work');
  await page.getByRole('button', { name: 'Approve changes' }).click();
  await page
    .getByRole('dialog', { name: 'Approve these changes?' })
    .getByRole('button', { name: 'Approve changes' })
    .click();
  await expect(page.getByRole('heading', { name: 'No changes waiting' })).toBeVisible();

  // Live now.
  await page.goto('/courses/course-live');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ladder safety at work' }),
  ).toBeVisible();
});

test('6. switch to Amharic and dark mode: layout and fonts hold', async ({ page }) => {
  const email = uniqueEmail('flow6');
  await mockApi(page, learner(email));
  await signInAsLearner(page, email);
  await page.setViewportSize({ width: 390, height: 844 });

  // Both switches are in the header.
  await page.getByRole('button', { name: 'Language: English' }).click();
  await page.getByRole('menuitemradio', { name: 'አማርኛ' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  await page.getByRole('button', { name: /^የቀለም ገጽታ/ }).click();
  await page.getByRole('menuitemradio', { name: /ጨለማ/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-dark', '');

  // Fonts: Noto Sans Ethiopic is loaded and used for the Amharic text.
  await expect(page.getByRole('heading', { level: 1, name: 'ኮርሶች' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('16px "Noto Sans Ethiopic"', 'ኮርሶች')))
    .toBe(true);
  expect(
    await page.evaluate(() => getComputedStyle(document.querySelector('h1') as Element).fontFamily),
  ).toMatch(/Noto Sans Ethiopic/);

  // Layout: no sideways scrolling on the catalog, a course and My learning; still after reload.
  for (const path of ['/courses', '/courses/course-1', '/learn']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      `${path} overflows`,
    ).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('lang', 'am');
    await expect(page.locator('html')).toHaveAttribute('data-dark', '');
  }
});
