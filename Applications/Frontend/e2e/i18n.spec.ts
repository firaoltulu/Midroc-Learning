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
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(ethiopic).toEqual([]);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('switching to Amharic translates the UI, sets lang/title, loads the font and persists', async ({
  page,
}) => {
  const ethiopic = trackEthiopicFont(page);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Language: English' }).click();
  await page.getByRole('menuitemradio', { name: 'አማርኛ' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  // "<page heading> – <app name>", in Amharic.
  await expect(page).toHaveTitle(/ – ሚድሮክ ትምህርት$/);
  await expect(page.getByRole('heading', { level: 1, name: 'ይግቡ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'በGoogle ይቀጥሉ' })).toBeVisible();

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
    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('lang', 'am');
    await expect(page.getByRole('heading', { level: 1, name: 'ይግቡ' })).toBeVisible();
  });
});

test.describe('long Amharic strings', () => {
  // Signed-in pages (catalog, player, editor, admin) are checked in the emulator suite.
  const PAGES = [
    { path: '/login', h1: 'ይግቡ' },
    { path: '/signup', h1: null },
    { path: '/forgot-password', h1: null },
  ];
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`the signed-out pages do not overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(() => {
        localStorage.setItem('midroc.language', 'am');
      });
      for (const { path, h1 } of PAGES) {
        await page.goto(path);
        const heading = page.getByRole('heading', { level: 1, ...(h1 ? { name: h1 } : {}) });
        await expect(heading).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('lang', 'am');
        expect(await noHorizontalOverflow(page), `${path} overflows`).toBe(true);
        // Buttons wrap their (longer) Amharic labels instead of clipping them.
        for (const button of await page.getByRole('main').getByRole('button').all()) {
          expect(
            await button.evaluate((element) => element.scrollWidth <= element.clientWidth),
          ).toBe(true);
        }
      }
    });
  }
});
