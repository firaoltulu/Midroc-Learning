import { queryOptions, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError, apiRequest } from '../../../shared/api/client';
import { authKeys } from './keys';

/**
 * GET /me: the database profile. Its `role` and `status` are authoritative for UI guards
 * (not the token claim). openapi.yaml has no response schema for /me, so the shape below
 * mirrors the backend's User type and is validated at runtime.
 */
export const meSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: z.enum(['user', 'admin']),
  status: z.enum(['active', 'suspended']),
  createdAt: z.string(),
});

export type Me = z.infer<typeof meSchema>;

export const meQueryOptions = () =>
  queryOptions({
    queryKey: authKeys.me,
    queryFn: async ({ signal }) => meSchema.parse(await apiRequest('/me', { signal })),
    staleTime: 60_000,
    // A suspended account is not a transient failure.
    retry: (failureCount, error) => !isAccountBlocked(error) && failureCount < 1,
  });

/**
 * The profile. Under the _authenticated layout the guard has already loaded it; elsewhere
 * (e.g. the shell header) pass `enabled: false` while nobody verified is signed in.
 */
export function useMe(options: { enabled?: boolean } = {}) {
  return useQuery({ ...meQueryOptions(), enabled: options.enabled ?? true });
}

/**
 * The backend refuses /me for suspended accounts with 403. The spec names the code
 * ACCOUNT_SUSPENDED; the current backend sends a 403 without a code, so any 403 from /me
 * is treated the same way.
 */
export function isAccountBlocked(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    (error.code === 'ACCOUNT_SUSPENDED' || error.code === undefined)
  );
}
