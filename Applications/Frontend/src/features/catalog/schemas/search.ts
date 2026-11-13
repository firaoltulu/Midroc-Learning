import { z } from 'zod';

/**
 * /courses search params. Every filter lives in the URL (shareable, back/forward work).
 * Invalid values are dropped instead of failing the page; defaults are left out of the URL.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  category: z.string().trim().max(100).optional().catch(undefined),
  language: z.enum(['en', 'am']).optional().catch(undefined),
  page: z.number().int().min(1).max(10_000).optional().catch(undefined),
});

export type CatalogSearch = z.infer<typeof catalogSearchSchema>;

export const CATALOG_PAGE_SIZE = 12;

/** True when any filter (not the page) narrows the catalog. */
export const hasFilters = (search: CatalogSearch) =>
  Boolean(search.q || search.category || search.language);
