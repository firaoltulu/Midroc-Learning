import { expect, test } from '@playwright/test';

test('public authentication pages render and protected account returns to sign in', async ({
  page
}) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();

  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await expect(page.getByLabel('Confirm password')).toBeVisible();

  await page.goto('/forgot-password');
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();

  await page.goto('/verify-email');
  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();

  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?redirect=%2Faccount$/);
});
