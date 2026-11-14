import { expect, test, type Page } from '@playwright/test';

// Token values from src/shared/theme/theme.ts as the browser reports them.
const PAGE_BG = { light: 'rgb(247, 248, 246)', dark: 'rgb(14, 19, 17)' };
const PRIMARY = { light: 'rgb(19, 83, 57)', dark: 'rgb(90, 161, 66)' };

const bodyBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe('themes', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`follows the system ${scheme} scheme by default`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/login');
      await expect(page.locator('html')).toHaveAttribute(`data-${scheme}`, '');
      expect(await bodyBackground(page)).toBe(PAGE_BG[scheme]);
      // Header logos are decorative (the link carries the name), so select by variant.
      await expect(page.getByRole('banner').locator('img[data-variant="full"]')).toHaveAttribute(
        'src',
        new RegExp(`logo-${scheme}`),
      );
    });
  }

  test('a manual choice overrides the system and survives a reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/login');
    await page.getByRole('button', { name: /Color theme/ }).click();
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-dark', '');
    expect(await bodyBackground(page)).toBe(PAGE_BG.dark);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-dark', '');
    await expect(page.getByRole('button', { name: 'Color theme: Dark' })).toBeVisible();

    await page.getByRole('button', { name: /Color theme/ }).click();
    await page.getByRole('menuitemradio', { name: 'Match device' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-light', '');
  });
});

test.describe('accessibility basics', () => {
  test('the skip link is the first stop and moves focus to the main content', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`keyboard focus shows a visible ring in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/login');
      const themeButton = page.getByRole('button', { name: /Color theme/ });
      await themeButton.focus();
      // Focus via keyboard so :focus-visible applies.
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(themeButton).toBeFocused();
      const outline = await themeButton.evaluate((element) => {
        const style = getComputedStyle(element);
        return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
      });
      expect(outline).toEqual({ style: 'solid', width: '2px', color: PRIMARY[scheme] });
    });
  }

  test('reduced motion shortens transitions to near zero', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/login');
    const duration = await page
      .getByRole('button', { name: 'Continue with Google' })
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(duration.split(',').every((value) => parseFloat(value) < 0.001)).toBe(true);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const normal = await page
      .getByRole('button', { name: 'Continue with Google' })
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(normal.split(',').some((value) => parseFloat(value) >= 0.1)).toBe(true);
  });
});

test('unknown routes show the NotFound screen inside the shell', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await page.getByRole('link', { name: 'Go to the home page' }).click();
  // Home needs sign-in, so the link ends on the login page.
  await expect(page).toHaveURL(/\/login/);
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('signed out, the header shows the mark and no empty navigation', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('banner').locator('img[data-variant="mark"]')).toBeVisible();
    // Nothing to navigate to before signing in (the signed-in drawer is tested in the
    // emulator suite).
    await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
  });
});
