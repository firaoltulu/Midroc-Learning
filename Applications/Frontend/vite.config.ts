import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { z } from 'zod';
import { defineConfig, loadEnv } from 'vite';

const proxyTargetSchema = z.string().url();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const parsedProxyTarget = proxyTargetSchema.safeParse(
    env.API_PROXY_TARGET ?? 'http://localhost:3000'
  );

  if (!parsedProxyTarget.success) {
    throw new Error(`Invalid API_PROXY_TARGET: ${parsedProxyTarget.error.message}`);
  }

  return {
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true
      }),
      react()
    ],
    server: {
      proxy: {
        '/api': {
          target: parsedProxyTarget.data,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  };
});
