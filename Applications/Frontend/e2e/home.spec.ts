import { expect, test } from '@playwright/test';

test('signed-out visitors are sent from a protected page to sign in, with a return path', async ({
  page,
}) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?redirect=%2Faccount$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  // No navigation or user menu for signed-out visitors (only the public design page).
  await expect(page.getByRole('button', { name: /Account menu/ })).toHaveCount(0);
});

test('the auth pages link to each other and keep the return path', async ({ page }) => {
  await page.goto('/login?redirect=%2Faccount');
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page).toHaveURL(/\/signup\?redirect=%2Faccount$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Create your account' })).toBeVisible();
  await page.getByRole('link', { name: 'Sign in' }).click();
  await page.getByRole('link', { name: 'Forgot your password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password\?redirect=%2Faccount$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible();
});

test('the sign-in form validates before contacting Firebase', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Enter your email')).toBeVisible();
  await expect(page.getByText('Enter your password')).toBeVisible();
});

test('/verify-email needs a signed-in user', async ({ page }) => {
  await page.goto('/verify-email');
  await expect(page).toHaveURL(/\/login/);
});
