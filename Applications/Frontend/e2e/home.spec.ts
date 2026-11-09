import { expect, test } from '@playwright/test';

test('home route renders the learning welcome', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Language: Amharic' })).toBeVisible();
});
