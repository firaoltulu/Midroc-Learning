// zod settings first (the env check below uses zod), then validate the environment.
import './shared/lib/zod-config';
import './shared/lib/env';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app';
import { initI18n } from './shared/i18n/setup';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

// Render only once the detected language's strings are available (no flash of English).
await initI18n();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
