import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { beforeEach, afterEach } from 'vitest';
import i18n from '../shared/i18n/i18n';

afterEach(cleanup);

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('en');
});
