import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';

export const courseIdSchema = z.string().uuid();
export const courseLanguageSchema = z.enum(['en', 'am']);
export const courseLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
/** "What you'll learn": short sentences. */
export const courseOutcomesSchema = z.array(z.string().trim().min(1).max(200)).max(12);
/** "Skills you'll gain": short labels, like tags. */
export const courseSkillsSchema = z.array(z.string().trim().min(1).max(40)).max(20);
export const catalogSortSchema = z.enum(['newest', 'popular']);
export const courseCreateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(20_000).default(''),
    category: z.string().trim().max(100).nullable().optional(),
    language: courseLanguageSchema.default('en'),
    thumbnailUrl: z
      .string()
      .url()
      .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
        message: 'Only http and https URLs are allowed',
        params: { code: 'HTTP_URL_REQUIRED' }
      })
      .nullable()
      .optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    estimatedDurationMinutes: z.number().int().min(0).nullable().optional(),
    level: courseLevelSchema.nullable().optional(),
    outcomes: courseOutcomesSchema.default([]),
    skills: courseSkillsSchema.default([])
  })
  .strict();

export const catalogQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  language: courseLanguageSchema.optional(),
  /** newest (default): most recently published first. popular: most enrollments first. */
  sort: catalogSortSchema.default('newest')
}).strict();

export const submitSchema = z.object({}).strict();
export type CourseCreateInput = z.infer<typeof courseCreateSchema>;
