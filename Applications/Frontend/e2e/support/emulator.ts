import { expect, type Page } from '@playwright/test';

/** Helpers for specs that sign in for real against the Firebase Auth emulator. */
export const EMULATOR = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'}`;
export const PROJECT = 'demo-midroc';

/**
 * A fresh address per test. Specs run in parallel against one emulator, so tests never reset
 * shared state; they just don't share accounts.
 */
export function uniqueEmail(name: string) {
  return `${name}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/**
 * Applies the latest verification link the emulator "sent" to `email`. No polling: sign-up
 * moves on to /verify-email only once the email has been sent.
 */
export async function verifyEmailInEmulator(page: Page, email: string) {
  const response = await page.request.get(`${EMULATOR}/emulator/v1/projects/${PROJECT}/oobCodes`);
  const { oobCodes } = (await response.json()) as {
    oobCodes: { email: string; requestType: string; oobLink: string }[];
  };
  const link = oobCodes
    .filter((c) => c.email === email && c.requestType === 'VERIFY_EMAIL')
    .at(-1)?.oobLink;
  expect(link, 'the verification email was sent').toBeDefined();
  await page.request.get(link ?? '');
}

export async function signUp(page: Page, email: string, path = '/signup') {
  await page.goto(path);
  await page.getByLabel('Full name').fill('Abebe Kebede');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/^Password/).fill('correct-horse-9');
  await page.getByRole('button', { name: 'Create account' }).click();
  // Signed up (and the verification email sent) once the guard moves us on.
  await expect(page).toHaveURL(/\/verify-email/);
}

/** Signs up, verifies the email and lands on the catalog: a ready, signed-in learner. */
export async function signInAsLearner(page: Page, email: string) {
  await signUp(page, email);
  await verifyEmailInEmulator(page, email);
  await page.getByRole('button', { name: "I've verified my email" }).click();
  await expect(page).toHaveURL(/\/courses/);
}
