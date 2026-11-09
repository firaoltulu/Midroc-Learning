import { expect, test } from '@playwright/test';

test('home route renders the learning welcome', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Language: Amharic' })).toBeVisible();
});

test('theme preference persists and selects the matching brand asset', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Change color theme' }).click();
  await page.getByRole('menuitem', { name: 'Dark' }).click();

  await expect(page.locator('html')).toHaveAttribute('data-dark', '');
  await expect(page.getByRole('img', { name: 'Midroc Learning' }).first()).toHaveAttribute(
    'src',
    /logo-dark/
  );

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-dark', '');
});

test('design preview shows both schemes and the mobile drawer navigates', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'Design preview' }).click();

  await expect(page.getByRole('heading', { name: 'Design preview', level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Light theme preview' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Dark theme preview' })).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 375);
});
