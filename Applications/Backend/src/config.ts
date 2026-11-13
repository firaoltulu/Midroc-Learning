import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  ADMIN_EMAILS: z.string().default(''),
  PDF_ROOT: z.string().default('/var/lib/lms/pdfs'),
  CORS_ORIGINS: z.string().default(''),
  YOUTUBE_CHECK_INTERVAL_HOURS: z.coerce.number().min(0).default(6),
  PDF_CLEANUP_DRY_RUN: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const config = {
  ...parsed.data,
  ADMIN_EMAILS: parsed.data.ADMIN_EMAILS.split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
};

export type Config = typeof config;
