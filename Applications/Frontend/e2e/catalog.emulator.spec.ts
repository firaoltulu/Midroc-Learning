import { expect, test, type Page } from '@playwright/test';
import { signInAsLearner, uniqueEmail } from './support/emulator';
import { learner, mockApi } from './support/mock-api';

/**
 * Catalog, course detail and My learning, signed in for real (Auth emulator) against the
 * mock API. Run with `npm run e2e:emulator`.
 */

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

test.beforeEach(async ({ page }) => {
  const email = uniqueEmail('learner');
  await mockApi(page, learner(email));
  await signInAsLearner(page, email);
});

test('filters live in the URL: shareable, reloadable, and back/forward work', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(3);

  await page.getByRole('searchbox', { name: 'Search courses' }).fill('leading');
  await expect(page).toHaveURL(/[?&]q=leading/);
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
  await expect(page.getByRole('link', { name: /Leading a team through change/ })).toBeVisible();

  // Survives a reload.
  await page.reload();
  await expect(page.getByRole('searchbox', { name: 'Search courses' })).toHaveValue('leading');
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);

  // Language filter, then back undoes it.
  await page.getByRole('searchbox', { name: 'Search courses' }).fill('');
  await expect(page).not.toHaveURL(/q=/);
  await page.getByRole('combobox', { name: 'Language' }).click();
  await page.getByRole('option', { name: 'አማርኛ' }).click();
  await expect(page).toHaveURL(/language=am/);
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
  await page.goBack();
  await expect(page).not.toHaveURL(/language=/);
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(3);
});

test('enroll, continue, find it in My learning, unenroll', async ({ page }) => {
  await page.getByRole('link', { name: 'Workplace safety basics' }).click();
  await expect(page).toHaveURL(/\/courses\/course-1$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Workplace safety basics' }),
  ).toBeVisible();

  const actions = page.getByRole('complementary', { name: 'Course actions' });
  await actions.getByRole('button', { name: 'Enroll' }).click();
  await expect(actions.getByRole('link', { name: 'Continue' })).toHaveAttribute(
    'href',
    '/learn/course-1/item-1',
  );

  await page.getByRole('banner').getByRole('link', { name: 'My learning' }).click();
  await expect(page.getByRole('link', { name: 'Workplace safety basics' })).toBeVisible();
  await page.getByRole('link', { name: 'Workplace safety basics' }).click();

  await actions.getByRole('button', { name: 'Unenroll' }).click();
  const dialog = page.getByRole('dialog', { name: 'Unenroll from this course?' });
  await dialog.getByRole('button', { name: 'Unenroll' }).click();
  await expect(actions.getByRole('button', { name: 'Enroll' })).toBeVisible();
});

test.describe('mobile width, both themes and both languages', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('navigation lives in a drawer and the header shows the mark', async ({ page }) => {
    const banner = page.getByRole('banner');
    await expect(banner.locator('img[data-variant="mark"]')).toBeVisible();
    await expect(banner.getByRole('link', { name: 'My learning' })).toBeHidden();

    await page.getByRole('button', { name: 'Open navigation' }).click();
    const drawer = page.locator('#mobile-navigation');
    await drawer.getByRole('link', { name: 'My learning' }).click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(drawer).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: 'My learning' })).toBeVisible();
  });

  for (const scheme of ['light', 'dark'] as const) {
    for (const language of ['en', 'am'] as const) {
      test(`${scheme}, ${language}: catalog, course and My learning fit the screen`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.evaluate((lang) => {
          localStorage.setItem('midroc.language', lang);
        }, language);

        const pages = [
          { path: '/courses', h1: language === 'en' ? 'Courses' : 'ኮርሶች' },
          { path: '/courses/course-2', h1: 'የሥራ ቦታ ደህንነት መሠረታዊ ነገሮች' },
          { path: '/courses/course-3', h1: /Leading a team through change/ },
          { path: '/learn', h1: language === 'en' ? 'My learning' : 'የእኔ ትምህርት' },
        ];
        for (const { path, h1 } of pages) {
          await page.goto(path);
          await expect(page.locator('html')).toHaveAttribute(`data-${scheme}`, '');
          await expect(page.locator('html')).toHaveAttribute('lang', language);
          await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible();
          // Let skeletons resolve before measuring.
          await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
          expect(await noHorizontalOverflow(page), `${path} overflows`).toBe(true);
        }

        // Course content in the other language carries its own lang attribute.
        await page.goto('/courses/course-2');
        const title = page.getByRole('heading', { level: 1, name: 'የሥራ ቦታ ደህንነት መሠረታዊ ነገሮች' });
        await expect(title).toBeVisible();
        expect(
          await title.evaluate((element) => element.closest('[lang]')?.getAttribute('lang')),
        ).toBe('am');
      });
    }
  }
});

test('the catalog and a course page load without layout shift (CLS under 0.1)', async ({
  page,
}) => {
  for (const path of ['/courses', '/courses/course-1']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    // Layout shifts since navigation (buffered), without those right after user input.
    const cls = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
            })[]) {
              if (!entry.hadRecentInput) total += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => {
            resolve(total);
          }, 500);
        }),
    );
    expect(cls, `${path} CLS`).toBeLessThan(0.1);
  }
});
