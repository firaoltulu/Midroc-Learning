import { expect, test, type Page } from '@playwright/test';
import { signInAsLearner, uniqueEmail } from './support/emulator';
import { learner, mockApi, type MockApi } from './support/mock-api';

/**
 * The learning player on the production build: a real PDF rendered by pdf.js (worker
 * included), progress, the "video unavailable" state, and the mobile layout. Signed in for
 * real against the Auth emulator; the API is mocked. Run with `npm run e2e:emulator`.
 */

let api: MockApi;

async function enrollAndOpen(page: Page, itemPath: string) {
  await page.goto('/courses/course-1');
  const actions = page.getByRole('complementary', { name: 'Course actions' });
  await actions.getByRole('button', { name: 'Enroll' }).click();
  await expect(actions.getByRole('link', { name: 'Continue' })).toBeVisible();
  await page.goto(itemPath);
}

test.beforeEach(async ({ page }) => {
  const email = uniqueEmail('player');
  api = await mockApi(page, learner(email));
  await signInAsLearner(page, email);
});

test('a PDF renders for real, pages through and completes on the last page', async ({ page }) => {
  const worker = page.waitForRequest(/pdf\.worker.*\.m?js/);
  await enrollAndOpen(page, '/learn/course-1/item-2');

  await expect(page.getByRole('heading', { level: 1, name: 'Safety handbook' })).toBeVisible();
  await worker;
  await expect(page.getByText('Page 1 of 3')).toBeVisible();
  await expect(page.locator('.react-pdf__Page canvas')).toBeVisible();
  // The text layer carries the page's words (selectable, readable by assistive tech).
  await expect(page.locator('.react-pdf__Page__textContent')).toContainText('Page 1');

  const next = page.getByRole('button', { name: 'Next page' });
  await next.click();
  await expect(page.locator('.react-pdf__Page__textContent')).toContainText('Page 2');
  await next.click();
  await expect(page.getByText('Page 3 of 3')).toBeVisible();
  await expect.poll(() => api.progress).toEqual([{ itemId: 'item-2', body: { completed: true } }]);

  // The outline checks the item off.
  const outline = page.getByRole('complementary', { name: 'Course content' });
  await expect(outline.getByRole('img', { name: 'Completed' })).toHaveCount(1);

  // Download carries a proper file name.
  await expect(page.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    'Safety handbook.pdf',
  );
});

test('an unavailable video says so; previous/next move through the course', async ({ page }) => {
  await enrollAndOpen(page, '/learn/course-1/item-1');
  await expect(page.getByRole('heading', { name: 'This video is unavailable' })).toBeVisible();

  const itemNav = page.getByRole('navigation', { name: 'Previous and next item' });
  await itemNav.getByRole('link', { name: 'Next' }).click();
  await expect(page).toHaveURL(/\/learn\/course-1\/item-2$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Safety handbook' })).toBeVisible();
  await itemNav.getByRole('link', { name: 'Previous' }).click();
  await expect(page).toHaveURL(/\/learn\/course-1\/item-1$/);
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const [scheme, language] of [
    ['light', 'en'],
    ['dark', 'am'],
  ] as const) {
    test(`${scheme}, ${language}: content first, the outline in a bottom drawer, no overflow`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await enrollAndOpen(page, '/courses/course-1');
      await page.evaluate((lang) => {
        localStorage.setItem('midroc.language', lang);
      }, language);
      await page.goto('/learn/course-1/item-2');
      await expect(page.locator('html')).toHaveAttribute('lang', language);

      await expect(page.locator('.react-pdf__Page canvas')).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);

      // The side panel is hidden; the drawer opens from the bottom.
      const outlineLabel = language === 'en' ? 'Course content' : 'የኮርሱ ይዘት';
      await expect(page.getByRole('complementary', { name: outlineLabel })).toBeHidden();
      await page.getByRole('button', { name: new RegExp(outlineLabel) }).click();
      const drawer = page.getByRole('navigation', { name: outlineLabel });
      await expect(drawer).toBeVisible();
      await drawer.getByRole('link', { name: /Final quiz/ }).click();
      await expect(page).toHaveURL(/\/learn\/course-1\/item-3$/);
      await expect(drawer).toBeHidden();
    });
  }
});
