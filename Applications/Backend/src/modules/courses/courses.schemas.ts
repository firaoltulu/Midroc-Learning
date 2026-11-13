import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';

export const courseIdSchema = z.string().uuid();
export const courseLanguageSchema = z.enum(['en', 'am']);
export const courseCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(20_000).default(''),
    category: z.string().trim().max(100).nullable().optional(),
    language: courseLanguageSchema.default('en'),
    thumbnailUrl: z
      .string()
      .url()
      .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol))
      .nullable()
      .optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    estimatedDurationMinutes: z.number().int().min(0).nullable().optional()
  })
  .strict();

export const catalogQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  language: courseLanguageSchema.optional()
}).strict();

export const submitSchema = z.object({}).strict();
export type CourseCreateInput = z.infer<typeof courseCreateSchema>;
