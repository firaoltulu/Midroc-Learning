import { z } from 'zod';
import {
  courseLanguageSchema,
  courseLevelSchema,
  courseOutcomesSchema,
  courseSkillsSchema
} from '../courses/index.js';
import { revisionTreeSchema } from '../content/index.js';

export const coursePatchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(20_000).optional(),
    category: z.string().trim().max(100).nullable().optional(),
    language: courseLanguageSchema.optional(),
    thumbnailUrl: z
      .string()
      .url()
      .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
        message: 'Only http and https URLs are allowed',
        params: { code: 'HTTP_URL_REQUIRED' }
      })
      .nullable()
      .optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
    estimatedDurationMinutes: z.number().int().min(0).nullable().optional(),
    level: courseLevelSchema.nullable().optional(),
    outcomes: courseOutcomesSchema.optional(),
    skills: courseSkillsSchema.optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

const revisionCourseSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(20_000).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  language: courseLanguageSchema.optional()
}).strict();

export const courseRevisionPutSchema = z.object({
  course: revisionCourseSchema.optional(),
  modules: revisionTreeSchema.shape.modules.optional()
}).strict().refine((value) =>
  Object.keys(value).length > 0 &&
  (value.course === undefined || Object.keys(value.course).length > 0)
);

export const courseRevisionRejectSchema = z.object({
  reason: z.string().trim().min(1).max(4000)
}).strict();
