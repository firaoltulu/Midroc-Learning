import { QueryClient } from '@tanstack/react-query';

/** Phase 5 refines these defaults (per-query staleTime, gcTime for authoring views). */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  });
}
