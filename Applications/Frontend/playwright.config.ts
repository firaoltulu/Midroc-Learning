import { defineConfig, devices } from '@playwright/test';

// E2E runs against a production build (vite preview): closer to deployment, and no dev-time
// dependency optimizer reloading the page in the middle of a test. Own port, always rebuilt.
const port = 4180;

// `npm run e2e:emulator` runs Playwright through `firebase emulators:exec`, which sets
// FIREBASE_AUTH_EMULATOR_HOST. Then only the *.emulator.spec.ts flows run, against a build
// that signs in to the local Auth emulator (project "demo-midroc", no real Firebase needed).
const authEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;

export default defineConfig({
  testDir: './e2e',
  ...(authEmulator
    ? { testMatch: '**/*.emulator.spec.ts' }
    : { testIgnore: '**/*.emulator.spec.ts' }),
  fullyParallel: !authEmulator,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite build && npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
    // The API is mocked per test (page.route). Firebase values only satisfy env validation,
    // except in emulator mode, where they point the SDK at the local emulator.
    env: {
      VITE_FIREBASE_API_KEY: 'e2e-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'e2e.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: authEmulator ? 'demo-midroc' : 'e2e-project',
      VITE_FIREBASE_APP_ID: 'e2e-app-id',
      VITE_API_BASE: '/api',
      VITE_FIREBASE_EMULATOR: authEmulator ?? '',
    },
  },
});
