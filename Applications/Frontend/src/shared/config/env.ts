import { z } from 'zod';

const environmentSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default('/api'),
  VITE_FIREBASE_API_KEY: z.string().optional(),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  VITE_FIREBASE_PROJECT_ID: z.string().optional(),
  VITE_FIREBASE_APP_ID: z.string().optional(),
  VITE_FIREBASE_EMULATOR: z.preprocess(
    (value) => (value === '' || value === 'false' ? undefined : value),
    z.union([z.literal('true'), z.string().url()]).optional()
  )
});

export const env = environmentSchema.parse(import.meta.env);

export const firebaseEmulatorUrl =
  env.VITE_FIREBASE_EMULATOR === 'true'
    ? 'http://127.0.0.1:9099'
    : env.VITE_FIREBASE_EMULATOR || undefined;

export const isFirebaseConfigured =
  Boolean(firebaseEmulatorUrl) ||
  Boolean(
    env.VITE_FIREBASE_API_KEY &&
    env.VITE_FIREBASE_AUTH_DOMAIN &&
    env.VITE_FIREBASE_PROJECT_ID &&
    env.VITE_FIREBASE_APP_ID
  );
