import { test } from '@playwright/test';
import { expectAccessible, LANGUAGES, SCHEMES, settle, useSchemeAndLanguage } from './support/axe';
import { mockPublicCatalog } from './support/mock-public';

/** axe on the signed-out pages (and the footer pages), in both color schemes and both languages. */

const PAGES = [
  '/welcome',
  '/login',
  '/signup',
  '/forgot-password',
  '/about',
  '/help',
  '/privacy',
  '/terms',
  '/no-such-page',
];

for (const scheme of SCHEMES) {
  for (const language of LANGUAGES) {
    test(`signed-out pages are accessible (${scheme}, ${language})`, async ({ page }, testInfo) => {
      await mockPublicCatalog(page);
      await page.goto('/login');
      await useSchemeAndLanguage(page, scheme, language);
      for (const path of PAGES) {
        await page.goto(path);
        await settle(page, scheme, language);
        await expectAccessible(page, testInfo, `${path} ${scheme} ${language}`);
      }
    });
  }
}
