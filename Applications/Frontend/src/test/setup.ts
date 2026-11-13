/// <reference types="@testing-library/jest-dom/vitest" />
import * as matchers from '@testing-library/jest-dom/matchers';

// Use the global `expect` (Vitest globals) instead of `import { expect } from 'vitest'`:
// on Windows a lower-case drive letter (d:\ vs D:\) can make a setup file resolve a second
// `vitest` instance, which breaks hooks and matcher registration.
// Testing Library cleans up after each test automatically because globals are enabled.
expect.extend(matchers);

// jsdom has no matchMedia; MUI's color-scheme manager needs it. Tests can override
// `window.__prefersDark` to simulate the system setting.
declare global {
  interface Window {
    __prefersDark?: boolean;
  }
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) =>
    ({
      matches: query.includes('prefers-color-scheme: dark') ? Boolean(window.__prefersDark) : false,
      media: query,
      onchange: null,
      // MUI's color-scheme manager still uses the legacy listener API.
      ...{ addListener: () => undefined, removeListener: () => undefined },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
});
