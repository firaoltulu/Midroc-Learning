import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { EMULATOR, signInAsLearner, uniqueEmail } from './support/emulator';
import { learner, mockApi } from './support/mock-api';

/**
 * The Content-Security-Policy of deploy/nginx.conf.example, checked against real traffic: the
 * real YouTube IFrame API and player, a real https thumbnail and the pdf.js worker (only the
 * API is mocked). Fails on any CSP violation.
 *
 * Opt-in (it needs the internet): E2E_CSP=1 npm run e2e:emulator. Against `vite preview` the
 * policy is taken from nginx.conf.example; against a running Docker image (E2E_BASE_URL) the
 * header nginx actually serves is used, and it must be there. See docs/e2e.md.
 * The emulator origin is the one thing added to the policy (connect-src, frame-src): production
 * signs in against Google's origins.
 */

test.skip(!process.env.E2E_CSP, 'opt-in: E2E_CSP=1 (needs the internet); see docs/e2e.md');

// Pages that Playwright fulfills (to set the policy) count as public for Chrome's Local Network
// Access checks, which would then block the SDK's calls to the emulator on 127.0.0.1.
test.use({
  launchOptions: {
    args: [
      '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests',
    ],
  },
});

const DEPLOYED = Boolean(process.env.E2E_BASE_URL);
/** The build's authDomain (playwright.config.ts) stands in for the template variable. */
const AUTH_DOMAIN = 'e2e.firebaseapp.com';

function policyFromNginxConf(): string {
  const conf = readFileSync(new URL('../deploy/nginx.conf.example', import.meta.url), 'utf8');
  const policy = /add_header Content-Security-Policy "([^"]+)"/.exec(conf)?.[1];
  if (!policy) throw new Error('no Content-Security-Policy in deploy/nginx.conf.example');
  return policy.replaceAll('${FIREBASE_AUTH_DOMAIN}', AUTH_DOMAIN);
}

const PDFJS_VERSION = (
  JSON.parse(
    readFileSync(new URL('../node_modules/pdfjs-dist/package.json', import.meta.url), 'utf8'),
  ) as { version: string }
).version;

// YouTube's own IFrame API sample video (embeddable, stable).
const VIDEO_ID = 'M7lc1UVf-VE';
const THUMBNAIL = `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`;

interface Violation {
  directive: string;
  blockedURI: string;
  source: string;
}

/** Applies the policy to every page load and collects the violations the page reports. */
async function watchCsp(page: Page, baseURL: string) {
  const policies: string[] = [];
  await page.route(`${new URL(baseURL).origin}/**`, async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    const response = await route.fetch();
    const served = response.headers()['content-security-policy'] as string | undefined;
    if (DEPLOYED) expect(served, 'nginx serves the Content-Security-Policy').toBeTruthy();
    const policy = served ?? policyFromNginxConf();
    policies.push(policy);
    const widened = policy
      .replace('connect-src', `connect-src ${EMULATOR}`)
      .replace('frame-src', `frame-src ${EMULATOR}`);
    return route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': widened },
    });
  });
  // Reported to the test process, so violations from every page load are kept.
  const violations: Violation[] = [];
  await page.exposeFunction('__reportCsp', (violation: Violation) => {
    violations.push(violation);
  });
  await page.addInitScript(() => {
    const report = (window as unknown as { __reportCsp: (violation: Violation) => void })
      .__reportCsp;
    document.addEventListener('securitypolicyviolation', (event) => {
      report({
        directive: event.effectiveDirective,
        blockedURI: event.blockedURI,
        source: `${event.sourceFile}:${String(event.lineNumber)}`,
      });
    });
  });
  return { policies, violations };
}

test('the served CSP allows the app, YouTube, thumbnails and the PDF viewer', async ({
  page,
  baseURL,
}) => {
  const csp = await watchCsp(page, baseURL ?? '');
  const email = uniqueEmail('csp');
  await mockApi(page, learner(email), {
    videoAvailable: true,
    youtubeVideoId: VIDEO_ID,
    thumbnailUrl: THUMBNAIL,
  });
  await signInAsLearner(page, email);
  expect(csp.policies[0]).toContain("default-src 'self'");

  // Catalog: an external https thumbnail.
  const thumbnail = page.locator(`img[src="${THUMBNAIL}"]`).first();
  await thumbnail.scrollIntoViewIfNeeded();
  await expect
    .poll(() => thumbnail.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);

  // Course page, enroll, then the real YouTube player (IFrame API + nocookie frame).
  await page.goto('/courses/course-1');
  const actions = page.getByRole('complementary', { name: 'Course actions' });
  await actions.getByRole('button', { name: 'Enroll' }).click();
  await expect(actions.getByRole('link', { name: 'Continue' })).toBeVisible();
  await page.goto('/learn/course-1/item-1');
  const frame = page.locator('iframe[src^="https://www.youtube-nocookie.com/embed/"]');
  await expect(frame).toBeVisible({ timeout: 20_000 });
  await expect(
    page.frameLocator('iframe[src^="https://www.youtube-nocookie.com/embed/"]').locator('video'),
  ).toBeAttached({ timeout: 20_000 });

  // The PDF viewer: pdf.js worker from our assets, a blob: URL for Download.
  const worker = page.waitForRequest(/pdf\.worker.*\.m?js/);
  await page.goto('/learn/course-1/item-2');
  await worker;
  await expect(page.locator('.react-pdf__Page canvas')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download' })).toHaveAttribute('href', /^blob:/);

  // pdf.js's WebAssembly decoders (JPEG 2000 here) are served by us, with the wasm MIME type,
  // and the policy lets them compile ('wasm-unsafe-eval').
  const compiled = await page.evaluate(async (url) => {
    try {
      await WebAssembly.compileStreaming(fetch(url));
      return 'ok';
    } catch (error) {
      return String(error);
    }
  }, `/assets/pdfjs-${PDFJS_VERSION}/wasm/openjpeg.wasm`);
  expect(compiled).toBe('ok');

  expect(csp.violations).toEqual([]);
});

test('the color-mode script runs under the CSP (no light flash in dark mode)', async ({
  page,
  baseURL,
}) => {
  const csp = await watchCsp(page, baseURL ?? '');
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('midroc.color-mode', 'dark');
  });
  // Block the app bundle: only the inline script in index.html can set the attribute.
  await page.route(/\/assets\/.*\.js$/, (route) => route.abort());
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-dark', '');
  expect(csp.violations).toEqual([]);
});
