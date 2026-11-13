import { z } from 'zod';

/** The new-course form (CourseCreate in openapi.yaml: title 1–200 characters, language). */
export const newCourseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'myCourses:new.errors.titleRequired')
    .max(200, 'myCourses:new.errors.titleTooLong'),
  language: z.enum(['en', 'am']),
});

export type NewCourseValues = z.infer<typeof newCourseSchema>;
