import { expect, test } from '@playwright/test';
import { signInAsLearner, uniqueEmail } from './support/emulator';
import { learner, mockApi } from './support/mock-api';
import { mockAuthoring, type MockAuthoring } from './support/mock-authoring';

/**
 * Creating and building a draft course on the production build, signed in for real (Auth
 * emulator), against an in-memory authoring API. Run with `npm run e2e:emulator`.
 */

let authoring: MockAuthoring;

test.beforeEach(async ({ page }) => {
  const email = uniqueEmail('editor');
  await mockApi(page, learner(email));
  authoring = await mockAuthoring(page, 'user-1');
  await signInAsLearner(page, email);
});

test('create a course, build it with the keyboard, and submit it for review', async ({ page }) => {
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'My courses' })
    .click();
  await expect(page.getByText("You haven't created a course yet")).toBeVisible();
  await page.getByRole('link', { name: 'Create course' }).click();
  await page.getByRole('textbox', { name: 'Course title' }).fill('Ladder safety');
  await page.getByRole('button', { name: 'Create course' }).click();

  // Details save as you type.
  await expect(page.getByRole('heading', { level: 1, name: 'Ladder safety' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Description' }).fill('Set up and climb ladders safely.');
  await expect(page.getByText('All changes saved')).toBeVisible();

  // Content: two modules, then move the second up with the keyboard drag handle.
  await page.getByRole('tab', { name: 'Content' }).click();
  for (const title of ['Basics', 'Advanced']) {
    await page.getByRole('button', { name: 'Add module' }).last().click();
    const dialog = page.getByRole('dialog', { name: 'Add a module' });
    await dialog.getByRole('textbox', { name: 'Module title' }).fill(title);
    await dialog.getByRole('button', { name: 'Add module' }).click();
    await expect(
      page.getByRole('heading', { level: 2, name: new RegExp(`· ${title}$`) }),
    ).toBeVisible();
  }
  const handle = page.getByRole('button', { name: 'Reorder Advanced' });
  await handle.focus();
  // Each step is announced to screen readers; wait for it like a listener would.
  await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByText('Advanced moved to position 1 of 2.')).toBeAttached();
  await page.keyboard.press('Space');
  await expect(page.getByText('Advanced dropped at position 1 of 2.')).toBeAttached();
  const modules = page.getByRole('list', { name: 'Modules' });
  await expect(modules.getByRole('heading', { level: 2 })).toHaveText([
    'Module 1 · Advanced',
    'Module 2 · Basics',
  ]);
  const order = authoring.writes.filter((write) => write.path.endsWith('/modules/order'));
  expect(order).toHaveLength(1);
  expect((order[0]?.body as { moduleIds: string[] }).moduleIds).toHaveLength(2);

  // An exam with one question in each module.
  for (const [module, title] of [
    ['Advanced', 'Advanced quiz'],
    ['Basics', 'Basics quiz'],
  ] as const) {
    // "+ Exam" under the module opens the dialog with Exam chosen.
    await page.getByRole('button', { name: `Exam (add to ${module})` }).click();
    const dialog = page.getByRole('dialog', { name: /^Add an item to / });
    await expect(dialog.getByRole('radio', { name: 'Exam' })).toBeChecked();
    await dialog.getByRole('textbox', { name: 'Item title' }).fill(title);
    await dialog.getByRole('button', { name: 'Add item' }).click();
    // The new item opens in the side panel.
    const panel = page.getByRole('region', { name: `Exam: ${title}` });
    await expect(panel).toBeVisible();
    await page.getByRole('button', { name: 'Add question', exact: true }).click();
    await page
      .getByRole('textbox', { name: 'Question', exact: true })
      .fill('Check the feet before climbing?');
    await page.getByRole('textbox', { name: 'Answer 1' }).fill('Yes');
    await page.getByRole('textbox', { name: 'Answer 2' }).fill('No');
    await page.getByRole('radio', { name: 'Answer 1 is correct' }).check();
    await expect(page.getByText('All changes saved')).toBeVisible();
    await panel.getByRole('button', { name: 'Close' }).click();
  }

  // Review: everything is done; submit.
  await page.getByRole('tab', { name: 'Review' }).click();
  const checklist = page.getByRole('list', { name: 'Ready for review?' });
  await expect(checklist.getByText('Done')).toHaveCount(4);
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(
    page.getByText(
      "This course is waiting for review, so it can't be edited until the review is done.",
    ),
  ).toBeVisible();
  await expect(page.getByText('In review')).toBeVisible();
});

test('on a phone, in Amharic and dark mode, the editor fits the screen', async ({ page }) => {
  await page.goto('/my-courses/new');
  await page.getByRole('textbox', { name: 'Course title' }).fill('Introduction to Farm Accounting');
  await page.getByRole('button', { name: 'Create course' }).click();
  await page.getByRole('tab', { name: 'Content' }).click();
  await page.getByRole('button', { name: 'Add module' }).last().click();
  const dialog = page.getByRole('dialog', { name: 'Add a module' });
  await dialog.getByRole('textbox', { name: 'Module title' }).fill('Foundations');
  await dialog.getByRole('button', { name: 'Add module' }).click();
  await expect(page.getByRole('heading', { level: 2, name: /Foundations$/ })).toBeVisible();

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => {
    localStorage.setItem('midroc.language', 'am');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  await expect(page.getByRole('heading', { level: 2, name: /Foundations$/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
