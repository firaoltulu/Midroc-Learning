import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/client';
import { courseKeys } from '../../../shared/api/query-keys';
import { listQuery } from '../../../shared/api/query-defaults';
import { courseLanguageSchema, courseLevelSchema } from '../../courses';
import type { CatalogSearch } from '../schemas/search';
import { categoriesSchema, SHELF_SIZE } from './catalog';

/**
 * The read-only catalog for signed-out visitors (reference/openapi.yaml: `/public/courses`,
 * PublicCourse): published courses without anything about the viewer, and the instructor's
 * short name.
 */
export const publicCourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  language: courseLanguageSchema,
  thumbnailUrl: z.string().nullable(),
  level: courseLevelSchema.nullable(),
  estimatedDurationMinutes: z.number().int().nullable(),
  publishedAt: z.string().nullable(),
  ownerName: z.string().nullable(),
  moduleCount: z.number().int(),
  enrollmentCount: z.number().int(),
  ratingAverage: z.number().nullable(),
  ratingCount: z.number().int(),
});

const publicPageSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  items: z.array(publicCourseSchema),
});

export type PublicCourse = z.infer<typeof publicCourseSchema>;

/** GET /public/courses: a short row of courses for the guest home page. */
export const publicShelfQueryOptions = (filters: Pick<CatalogSearch, 'language' | 'sort'>) => {
  const query = {
    language: filters.language,
    sort: filters.sort ?? 'newest',
    page: 1,
    pageSize: SHELF_SIZE,
  };
  return queryOptions({
    queryKey: courseKeys.publicList(query),
    queryFn: async ({ signal }) =>
      publicPageSchema.parse(await apiRequest('/public/courses', { query, signal })),
    placeholderData: keepPreviousData,
    ...listQuery,
  });
};

/** GET /public/courses/categories: the same categories, without sign-in. */
export const publicCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: courseKeys.publicCategories(),
    queryFn: async ({ signal }) =>
      categoriesSchema.parse(await apiRequest('/public/courses/categories', { signal })).categories,
    staleTime: 5 * 60_000,
  });
