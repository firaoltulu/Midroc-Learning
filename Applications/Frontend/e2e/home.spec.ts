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

test('Amharic design preview fits mobile and keeps long translated copy readable', async ({
  page
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const ethiopicFontRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('noto-sans-ethiopic')) ethiopicFontRequests.push(request.url());
  });

  await page.goto('/design');
  expect(ethiopicFontRequests).toHaveLength(0);
  await page.getByRole('button', { name: 'Language: Amharic' }).click();

  await expect.poll(() => ethiopicFontRequests.length).toBeGreaterThan(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  await expect(page).toHaveTitle('ሚድሮክ ለርኒንግ');
  await expect(page.getByRole('heading', { name: 'የንድፍ ቅድመ እይታ' })).toBeVisible();
  await expect(page.getByText('የጋራ የበይነገጽ ክፍሎችን', { exact: false })).toBeVisible();
  await expect(page.getByRole('region', { name: 'የጨለማ ገጽታ ቅድመ እይታ' })).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 375);
});

test('language detection prefers a saved choice, then browser language, then English', async ({
  browser
}) => {
  const savedContext = await browser.newContext({ locale: 'am-ET' });
  const savedPage = await savedContext.newPage();
  await savedPage.addInitScript(() => localStorage.setItem('midroc-language', 'en'));
  await savedPage.goto('http://127.0.0.1:5173/');
  await expect(savedPage.locator('html')).toHaveAttribute('lang', 'en');
  await savedContext.close();

  const browserContext = await browser.newContext({ locale: 'am-ET' });
  const browserPage = await browserContext.newPage();
  await browserPage.goto('http://127.0.0.1:5173/');
  await expect(browserPage.locator('html')).toHaveAttribute('lang', 'am');
  await browserContext.close();

  const fallbackContext = await browser.newContext({ locale: 'fr-FR' });
  const fallbackPage = await fallbackContext.newPage();
  await fallbackPage.goto('http://127.0.0.1:5173/');
  await expect(fallbackPage.locator('html')).toHaveAttribute('lang', 'en');
  await fallbackContext.close();
});
