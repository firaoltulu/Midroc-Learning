import { z } from 'zod';

/**
 * Building blocks for `validateSearch` schemas (filters live in the URL). Invalid values are
 * dropped instead of failing the page, and defaults stay out of the URL.
 */

/** Free-text search. */
export const searchText = () => z.string().trim().max(200).optional().catch(undefined);

/** 1-based page number. */
export const pageNumber = () => z.number().int().min(1).max(10_000).optional().catch(undefined);

/** One of a fixed set of values. */
export const oneOf = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).optional().catch(undefined);

/** A calendar day, YYYY-MM-DD. */
export const isoDay = () =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined);

/** Drops undefined values, so a search object only carries what's set. */
export function compactSearch<T extends object>(search: T): T {
  return Object.fromEntries(
    Object.entries(search).filter(([, value]) => value !== undefined && value !== ''),
  ) as T;
}
