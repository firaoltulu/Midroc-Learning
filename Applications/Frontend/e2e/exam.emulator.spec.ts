import { expect, test, type Page } from '@playwright/test';
import { signInAsLearner, uniqueEmail } from './support/emulator';
import { learner, mockApi } from './support/mock-api';

/**
 * Exam taking on the production build, signed in for real (Auth emulator) against the mock
 * API (which grades answers). Run with `npm run e2e:emulator`.
 */

async function enrollAndOpenExam(page: Page) {
  await page.goto('/courses/course-1');
  const actions = page.getByRole('complementary', { name: 'Course actions' });
  await actions.getByRole('button', { name: 'Enroll' }).click();
  await expect(actions.getByRole('link', { name: 'Continue' })).toBeVisible();
  await page.goto('/learn/course-1/item-3');
}

test.beforeEach(async ({ page }) => {
  const email = uniqueEmail('exam');
  await mockApi(page, learner(email));
  await signInAsLearner(page, email);
});

test('take the exam, pass, see the result and the history; the outline checks it off', async ({
  page,
}) => {
  await enrollAndOpenExam(page);
  await expect(page.getByText('Answer both questions.')).toBeVisible();
  await page.getByRole('button', { name: 'Start exam' }).click();

  await expect(page.getByRole('heading', { name: 'Question 1 of 2' })).toBeVisible();
  await expect(page.getByTestId('exam-clock')).toHaveText(/^(10:00|9:5\d)$/);
  await page.getByRole('radio', { name: 'A hard hat' }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Question 2 of 2' })).toBeFocused();
  await page.getByRole('checkbox', { name: 'Oily rags' }).check();
  await page.getByRole('checkbox', { name: 'Blocked exits' }).check();
  await page.getByRole('button', { name: 'Review answers' }).click();
  await expect(page.getByText('Every question is answered.')).toBeVisible();
  await page.getByRole('button', { name: 'Submit answers' }).click();

  await expect(page.getByRole('heading', { name: 'You passed' })).toBeFocused();
  await expect(page.getByText('100%', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Your attempts' })).toBeVisible();

  const outline = page.getByRole('complementary', { name: 'Course content' });
  await expect(outline.getByRole('link', { name: /, Completed$/ })).toHaveCount(1);
});

test('answers survive a page reload and the attempt resumes', async ({ page }) => {
  await enrollAndOpenExam(page);
  await page.getByRole('button', { name: 'Start exam' }).click();
  await page.getByRole('radio', { name: 'A hard hat' }).check();

  await page.reload();
  await page.getByRole('button', { name: 'Resume exam' }).click();
  await expect(page.getByRole('radio', { name: 'A hard hat' })).toBeChecked();
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('dark, Amharic: the exam fits the screen with touch-sized choices', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await enrollAndOpenExam(page);
    await page.evaluate(() => {
      localStorage.setItem('midroc.language', 'am');
    });
    await page.reload();
    await page.getByRole('button', { name: 'ፈተናውን ይጀምሩ' }).click();
    await expect(page.getByRole('heading', { name: 'ጥያቄ 1 ከ2' })).toBeVisible();

    const choice = page.locator('label', { has: page.getByRole('radio', { name: 'A hard hat' }) });
    const box = await choice.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
});
