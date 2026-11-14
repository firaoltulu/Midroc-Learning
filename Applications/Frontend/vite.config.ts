import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/**
 * Packages every page needs (React, router, query, i18n, Firebase Auth, the styling engine,
 * zod): grouped into one `framework` chunk. Module ids use forward slashes on every platform.
 */
const FRAMEWORK_PACKAGES = [
  'react',
  'react-dom',
  'scheduler',
  '@tanstack',
  'i18next',
  'i18next-browser-languagedetector',
  'react-i18next',
  '@firebase',
  'firebase',
  'idb',
  '@emotion',
  'stylis',
  '@mui/system',
  '@mui/utils',
  '@mui/styled-engine',
  '@mui/private-theming',
  'zod',
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:3000';

  return {
    // The router plugin must run before the React plugin.
    plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
    server: {
      port: 5173,
      proxy: {
        // The backend mounts every route under /api, so no path rewrite is needed.
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
    preview: { port: 4173 },
    // dist/.vite/manifest.json maps sources to chunks (used by `npm run check:bundle`).
    build: {
      manifest: true,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                // Framework code every page needs: one cacheable chunk instead of dozens of
                // small shared ones (better compression, fewer requests). MUI components and
                // feature code stay split per route.
                // src/shared/lib/zod-config.ts rides along: zod's settings must apply before
                // any chunk builds a schema, and this chunk runs before all app code.
                name: 'framework',
                test: new RegExp(
                  `node_modules/(${FRAMEWORK_PACKAGES.map((name) => name.replace('/', '\\/')).join('|')})/|src/shared/lib/zod-config\\.ts$`,
                ),
              },
            ],
          },
        },
      },
    },
  };
});
