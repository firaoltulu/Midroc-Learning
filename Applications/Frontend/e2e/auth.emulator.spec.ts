import { expect, test, type Page } from '@playwright/test';
import { signUp, uniqueEmail, verifyEmailInEmulator } from './support/emulator';

/**
 * Real sign-up / verification / sign-in against the Firebase Auth emulator.
 * Run with `npm run e2e:emulator` (starts the emulator, then Playwright). The backend is
 * mocked: GET /api/me answers from the bearer token's email.
 */
interface MeMock {
  status?: number;
  body?: Record<string, unknown>;
}

/** Mocks /api/me; records the Authorization headers it receives. */
async function mockMe(page: Page, email: string, override: MeMock = {}) {
  const authorizations: string[] = [];
  await page.route('**/api/me', async (route) => {
    authorizations.push((await route.request().headerValue('authorization')) ?? '');
    await route.fulfill({
      status: override.status ?? 200,
      json: override.body ?? {
        id: 'user-1',
        email,
        name: 'Abebe Kebede',
        role: 'user',
        status: 'active',
        createdAt: '2026-11-13T09:30:00.000Z',
      },
    });
  });
  return authorizations;
}

/** The catalog the user lands on after signing in: empty is enough here. */
async function mockEmptyCatalog(page: Page) {
  await page.route('**/api/courses**', (route) =>
    route.fulfill({
      json: route.request().url().includes('/categories')
        ? { items: [] }
        : { page: 1, pageSize: 12, total: 0, items: [] },
    }),
  );
}

test.beforeEach(async ({ page }) => {
  await mockEmptyCatalog(page);
});

test('sign up, verify the email, return to the requested page, sign out and sign in again', async ({
  page,
}) => {
  const email = uniqueEmail('abebe');
  const authorizations = await mockMe(page, email);

  // A protected page sends a visitor to sign in, remembering where they were going.
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?redirect=%2Faccount/);
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page).toHaveURL(/\/signup\?redirect=%2Faccount/);

  await signUp(page, email, page.url());
  await expect(page).toHaveURL(/\/verify-email/);
  await expect(page.getByRole('heading', { level: 1, name: 'Verify your email' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  // Not verified yet: the page says so and stays.
  await page.getByRole('button', { name: "I've verified my email" }).click();
  await expect(page.getByText("Your email isn't verified yet")).toBeVisible();
  expect(authorizations, '/me is not called before verification').toEqual([]);

  await verifyEmailInEmulator(page, email);
  await page.getByRole('button', { name: "I've verified my email" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();
  await expect(page.getByText(email).first()).toBeVisible();
  expect(authorizations.at(-1)).toMatch(/^Bearer .+/);

  // Sign out from the user menu.
  await page.getByRole('button', { name: 'Account menu for Abebe Kebede' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);

  // Wrong password: a translated message.
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/^Password/).fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText("That email and password don't match");

  // Right password: in, to the home page (the catalog).
  await page.getByLabel(/^Password/).fill('correct-horse-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/courses$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Courses' })).toBeVisible();

  // The session survives a reload (local persistence), with no flash of the login page.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Courses' })).toBeVisible();
  await expect(page).toHaveURL(/\/courses$/);
});

test('a suspended account is signed out and told why', async ({ page }) => {
  const email = uniqueEmail('suspended');
  await mockMe(page, email, {
    status: 403,
    body: { error: 'Account is suspended', code: 'ACCOUNT_SUSPENDED' },
  });
  await signUp(page, email);
  await expect(page).toHaveURL(/\/verify-email/);
  await verifyEmailInEmulator(page, email);
  await page.getByRole('button', { name: "I've verified my email" }).click();

  await expect(page).toHaveURL(/\/login\?.*reason=suspended/);
  await expect(page.getByText(/Your account is suspended/)).toBeVisible();
});

test('a non-admin sees the "not allowed" screen in the admin area', async ({ page }) => {
  const email = uniqueEmail('learner');
  await mockMe(page, email);
  await signUp(page, email);
  await verifyEmailInEmulator(page, email);
  await page.getByRole('button', { name: "I've verified my email" }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Courses' })).toBeVisible();

  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { level: 1, name: "You don't have access to this page" }),
  ).toBeVisible();
});

test('an admin reaches the admin area', async ({ page }) => {
  const email = uniqueEmail('admin');
  await mockMe(page, email, {
    body: {
      id: 'admin-1',
      email,
      name: 'Admin',
      role: 'admin',
      status: 'active',
      createdAt: '2026-11-13T09:30:00.000Z',
    },
  });
  await signUp(page, email);
  await verifyEmailInEmulator(page, email);
  await page.getByRole('button', { name: "I've verified my email" }).click();
  await expect(page.getByRole('link', { name: 'Administration' }).first()).toBeVisible();

  await page.goto('/admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Administration' })).toBeVisible();
});
