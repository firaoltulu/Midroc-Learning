import { z } from 'zod';

/** Empty strings in .env files mean "not set". */
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const required = z.string().trim().min(1);

const envSchema = z.object({
  VITE_FIREBASE_API_KEY: required,
  VITE_FIREBASE_AUTH_DOMAIN: required,
  VITE_FIREBASE_PROJECT_ID: required,
  VITE_FIREBASE_APP_ID: required,
  VITE_API_BASE: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^(\/|https?:\/\/)/, 'must be a path starting with / or an http(s) URL')
      .default('/api')
      .transform((value) => value.replace(/\/+$/, '')),
  ),
  VITE_FIREBASE_EMULATOR: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(/^[\w.-]+:\d{1,5}$/, 'must be host:port, e.g. 127.0.0.1:9099')
      .optional(),
  ),
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid environment configuration:\n  - ${issues.join('\n  - ')}`);
    this.name = 'EnvError';
    this.issues = issues;
  }
}

export function parseEnv(source: Record<string, unknown>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new EnvError(
      result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  return result.data;
}

/** Validated once at startup (main.tsx imports this module first). */
export const env: Env = parseEnv(import.meta.env);
