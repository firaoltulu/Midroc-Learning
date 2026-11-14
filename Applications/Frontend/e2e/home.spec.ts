import { expect, test } from '@playwright/test';
import { mockPublicCatalog } from './support/mock-public';

test('signed-out visitors are sent from a protected page to sign in, with a return path', async ({
  page,
}) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?redirect=%2Faccount$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  // No navigation or user menu for signed-out visitors.
  await expect(page.getByRole('button', { name: /Account menu/ })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
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

test('signed-out visitors to / see the guest home page, and a course asks them to sign in', async ({
  page,
}) => {
  await mockPublicCatalog(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Learn practical skills, in English and Amharic' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Workplace safety basics' }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcourses%2Fc1$/);
});
