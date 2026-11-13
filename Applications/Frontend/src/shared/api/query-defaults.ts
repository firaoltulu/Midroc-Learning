import type { QueryClientConfig } from '@tanstack/react-query';
import { isTransientError } from './errors';

/**
 * TanStack Query defaults (spec section 6). Spread a preset into a feature's queryOptions:
 *   queryOptions({ queryKey, queryFn, ...listQuery })
 */

/** Retry network failures and 5xx twice (with backoff); a 4xx won't change by retrying. */
export const retryTransient = (failureCount: number, error: unknown) =>
  failureCount < 2 && isTransientError(error);

/** Catalog, enrollments, admin tables: fresh for 30 s. */
export const listQuery = { staleTime: 30_000 } as const;

/**
 * Authoring views and exam questions: always refetched, dropped from the cache soon after
 * they're no longer shown (they contain answers), never refetched under unsaved edits.
 */
export const authoringQuery = {
  staleTime: 0,
  gcTime: 30_000,
  refetchOnWindowFocus: false,
} as const;

export const examQuery = authoringQuery;

export const queryClientDefaults: QueryClientConfig['defaultOptions'] = {
  queries: { ...listQuery, retry: retryTransient },
  mutations: { retry: false },
};

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: Error;
    mutationMeta: {
      /** Set false when the screen shows network failures itself (no global toast). */
      networkErrorToast?: boolean;
    };
  }
}
