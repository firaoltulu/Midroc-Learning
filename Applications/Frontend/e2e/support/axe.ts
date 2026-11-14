import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

export const SCHEMES = ['light', 'dark'] as const;
export const LANGUAGES = ['en', 'am'] as const;
export type Scheme = (typeof SCHEMES)[number];
export type Language = (typeof LANGUAGES)[number];

/** Follow the system scheme (emulated) and use `language` from the next page load on. */
export async function useSchemeAndLanguage(page: Page, scheme: Scheme, language: Language) {
  // Reduced motion: no fades in progress when colors are measured (dialogs, menus).
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
  await page.evaluate(
    ({ language }) => {
      localStorage.setItem('midroc.language', language);
      localStorage.removeItem('midroc.color-mode');
    },
    { language },
  );
}

/** Waits until the page settled: its h1 is there and no skeleton is busy. */
export async function settle(page: Page, scheme: Scheme, language: Language) {
  await expect(page.locator('html')).toHaveAttribute('lang', language);
  await expect(page.locator('html')).toHaveAttribute(`data-${scheme}`, '');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  // Let any remaining transitions finish before colors are measured.
  await page.waitForTimeout(300);
}

const describeNode = (node: { target: unknown[]; html: string; failureSummary?: string }) =>
  [
    `    ${node.target.join(' ')}`,
    `      ${node.html.slice(0, 160)}`,
    `      ${node.failureSummary ?? ''}`,
  ].join('\n');

/**
 * axe (WCAG 2.2 A/AA rules) on the current page. Serious and critical violations fail the
 * test (softly, so one run reports every page); the full result is attached to the report.
 */
export async function expectAccessible(page: Page, testInfo: TestInfo, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  await testInfo.attach(`axe ${label}`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });
  const blocking = results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) =>
        `${violation.id} (${violation.impact ?? ''}): ${violation.help}\n` +
        violation.nodes.slice(0, 5).map(describeNode).join('\n'),
    );
  expect.soft(blocking, [label, ...blocking].join('\n')).toEqual([]);
}
