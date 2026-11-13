import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

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
  };
});
