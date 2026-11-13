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

/** GET /courses/categories: categories in use by published courses. */
export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: courseKeys.categories(),
    queryFn: async ({ signal }) =>
      z
        .object({ items: z.array(z.string()) })
        .parse(await apiRequest('/courses/categories', { signal })).items,
    staleTime: 5 * 60_000,
  });
