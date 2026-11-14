import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/client';
import { courseKeys } from '../../../shared/api/query-keys';
import { listQuery } from '../../../shared/api/query-defaults';
import { catalogPageSchema } from '../../courses';
import { CATALOG_PAGE_SIZE, type CatalogSearch } from '../schemas/search';

/** GET /courses with the URL's filters. Keeps the previous page on screen while paging. */
export const catalogQueryOptions = (search: CatalogSearch) => {
  const filters = {
    q: search.q,
    category: search.category,
    language: search.language,
    sort: search.sort ?? 'newest',
    page: search.page ?? 1,
    pageSize: CATALOG_PAGE_SIZE,
  };
  return queryOptions({
    queryKey: courseKeys.list(filters),
    queryFn: async ({ signal }) =>
      catalogPageSchema.parse(await apiRequest('/courses', { query: filters, signal })),
    placeholderData: keepPreviousData,
    ...listQuery,
  });
};

const categoriesSchema = z.object({
  categories: z.array(z.object({ name: z.string(), courseCount: z.number().int() })),
});

export type Category = z.infer<typeof categoriesSchema>['categories'][number];

/** GET /courses/categories: categories of published courses (by name) with course counts. */
export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: courseKeys.categories(),
    queryFn: async ({ signal }) =>
      categoriesSchema.parse(await apiRequest('/courses/categories', { signal })).categories,
    staleTime: 5 * 60_000,
  });

export const SHELF_SIZE = 4;

/** A short row of courses for the home page (first page only). */
export const courseShelfQueryOptions = (filters: Pick<CatalogSearch, 'language' | 'sort'>) => {
  const query = {
    language: filters.language,
    sort: filters.sort ?? 'newest',
    page: 1,
    pageSize: SHELF_SIZE,
  };
  return queryOptions({
    queryKey: courseKeys.list(query),
    queryFn: async ({ signal }) =>
      catalogPageSchema.parse(await apiRequest('/courses', { query, signal })),
    placeholderData: keepPreviousData,
    ...listQuery,
  });
};
