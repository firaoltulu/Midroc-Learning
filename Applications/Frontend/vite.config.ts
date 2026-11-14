import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

/**
 * pdf.js loads extra files at run time: WebAssembly image decoders (JPEG 2000, JBIG2), color
 * profiles, character maps (CJK and other non-Latin PDFs) and the 14 standard fonts. Served
 * from our own origin under a versioned path in assets/, so they are cached as immutable and
 * the CSP needs no CDN. The learning feature builds the same path from pdfjs.version.
 */
const PDFJS_VERSION = (
  JSON.parse(readFileSync('node_modules/pdfjs-dist/package.json', 'utf8')) as { version: string }
).version;
const PDFJS_ASSET_DIRS = ['wasm', 'iccs', 'cmaps', 'standard_fonts'];

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
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      viteStaticCopy({
        targets: PDFJS_ASSET_DIRS.map((dir) => ({
          src: `node_modules/pdfjs-dist/${dir}/*`,
          dest: `assets/pdfjs-${PDFJS_VERSION}/${dir}`,
          rename: { stripBase: true },
        })),
      }),
    ],
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
