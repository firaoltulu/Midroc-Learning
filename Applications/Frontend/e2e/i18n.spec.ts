import { expect, test, type Page } from '@playwright/test';

/** Records every request for the Ethiopic font (CSS or font files). */
function trackEthiopicFont(page: Page) {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/ethiopic/i.test(request.url())) requests.push(request.url());
  });
  return requests;
}

async function noHorizontalOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

test('English never downloads the Ethiopic font', async ({ page }) => {
  const ethiopic = trackEthiopicFont(page);
  await page.goto('/design');
  await expect(page.getByRole('heading', { level: 1, name: 'Design system' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(ethiopic).toEqual([]);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('switching to Amharic translates the UI, sets lang/title, loads the font and persists', async ({
  page,
}) => {
  const ethiopic = trackEthiopicFont(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Language: English' }).click();
  await page.getByRole('menuitemradio', { name: 'አማርኛ' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  await expect(page).toHaveTitle('ሚድሮክ ትምህርት');
  await expect(
    page.getByRole('heading', { level: 1, name: 'ወደ ሚድሮክ ትምህርት እንኳን ደህና መጡ' }),
  ).toBeVisible();

  await expect.poll(() => ethiopic.some((url) => /\.woff2/.test(url))).toBe(true);
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('600 16px "Noto Sans Ethiopic"', 'ሰላም')))
    .toBe(true);

  // The theme enlarges the base size for Ethiopic.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(
    '17px',
  );

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  await expect(page.getByRole('button', { name: 'ቋንቋ፦ አማርኛ' })).toBeVisible();
});

test.describe('browser language', () => {
  test.use({ locale: 'am-ET' });

  test('an Amharic browser gets Amharic without choosing', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'am');
    await expect(page.getByRole('link', { name: 'መነሻ' }).first()).toBeAttached();
  });
});

test.describe('long Amharic strings', () => {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`the design page does not overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(() => {
        localStorage.setItem('midroc.language', 'am');
      });
      await page.goto('/design');
      await expect(page.getByRole('heading', { level: 1, name: 'የዲዛይን ሥርዓት' })).toBeVisible();
      expect(await noHorizontalOverflow(page)).toBe(true);

      // Ethiopian calendar dates on the design page, with Latin digits.
      await expect(page.getByText('4 ኅዳር 2019', { exact: true })).toBeVisible();

      // The long button label wraps inside its panel instead of being clipped.
      const button = page.getByRole('button', { name: 'ሁሉንም ለውጦች ለአስተዳዳሪ ግምገማ አስገባ' }).first();
      const fits = await button.evaluate((element) => element.scrollWidth <= element.clientWidth);
      expect(fits).toBe(true);
    });
  }
});
