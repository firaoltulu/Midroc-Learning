import { z } from 'zod';

/**
 * Course responses (reference/openapi.yaml: Course, CatalogCourse, CourseDetail), checked at
 * runtime so a contract change fails loudly at the boundary instead of deep in a component.
 */

export const courseStatusSchema = z.enum([
  'draft',
  'pending_review',
  'published',
  'rejected',
  'archived',
]);
export const courseLanguageSchema = z.enum(['en', 'am']);
export const courseLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export const itemTypeSchema = z.enum(['video', 'pdf', 'exam']);

export const courseSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  language: courseLanguageSchema,
  thumbnailUrl: z.string().nullable(),
  tags: z.array(z.string()),
  estimatedDurationMinutes: z.number().int().nullable(),
  level: courseLevelSchema.nullable(),
  /** "What you'll learn". */
  outcomes: z.array(z.string()),
  /** "Skills you'll gain". */
  skills: z.array(z.string()),
  status: courseStatusSchema,
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
  publishedAt: z.string().nullable(),
});

export const catalogCourseSchema = courseSchema.extend({
  ownerName: z.string().nullable(),
  enrolled: z.boolean(),
  moduleCount: z.number().int(),
  enrollmentCount: z.number().int(),
  /** Average learner rating (1-5, one decimal); null without ratings. */
  ratingAverage: z.number().nullable(),
  ratingCount: z.number().int(),
});

export const ownReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  updatedAt: z.string(),
});

export const catalogPageSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  items: z.array(catalogCourseSchema),
});

export const courseDetailSchema = catalogCourseSchema.extend({
  modules: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      position: z.number().int(),
      items: z.array(z.object({ id: z.string(), type: itemTypeSchema, title: z.string() })),
    }),
  ),
  completedItemIds: z.array(z.string()),
  pendingRevision: z.object({ id: z.string(), submittedAt: z.string() }).nullable(),
  updatedAt: z.string(),
  /** How many ratings gave 1 to 5 stars. */
  ratingDistribution: z.object({
    '1': z.number().int(),
    '2': z.number().int(),
    '3': z.number().int(),
    '4': z.number().int(),
    '5': z.number().int(),
  }),
  myReview: ownReviewSchema.nullable(),
});

export type CourseStatus = z.infer<typeof courseStatusSchema>;
export type CourseLanguage = z.infer<typeof courseLanguageSchema>;
export type CourseLevel = z.infer<typeof courseLevelSchema>;
export type ItemType = z.infer<typeof itemTypeSchema>;
export type Course = z.infer<typeof courseSchema>;
export type CatalogCourse = z.infer<typeof catalogCourseSchema>;
export type CatalogPage = z.infer<typeof catalogPageSchema>;
export type CourseDetail = z.infer<typeof courseDetailSchema>;
