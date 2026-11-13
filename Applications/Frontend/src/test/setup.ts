/// <reference types="@testing-library/jest-dom/vitest" />
import * as matchers from '@testing-library/jest-dom/matchers';

// Use the global `expect` (Vitest globals) instead of `import { expect } from 'vitest'`:
// on Windows a lower-case drive letter (d:\ vs D:\) can make a setup file resolve a second
// `vitest` instance, which breaks hooks and matcher registration.
// Testing Library cleans up after each test automatically because globals are enabled.
expect.extend(matchers);
