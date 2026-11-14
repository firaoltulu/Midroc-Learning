import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../../../shared/api/client';
import { listQuery } from '../../../../shared/api/query-defaults';
import { adminKeys, meKeys } from '../../../../shared/api/query-keys';

export const ROLES = ['user', 'admin'] as const;
export const ACCOUNT_STATUSES = ['active', 'suspended'] as const;
export type Role = (typeof ROLES)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** reference/openapi.yaml: User. */
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: z.enum(ROLES),
  status: z.enum(ACCOUNT_STATUSES),
  createdAt: z.string(),
});

export type User = z.infer<typeof userSchema>;

/** reference/openapi.yaml: AdminUser (the list adds how many courses they own and take). */
export const adminUserSchema = userSchema.extend({
  courseCount: z.number().int(),
  enrollmentCount: z.number().int(),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

export const USERS_PAGE_SIZE = 20;

export interface UsersFilters {
  q?: string;
  role?: Role;
  status?: AccountStatus;
  page?: number;
}

const userPageSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  items: z.array(adminUserSchema),
});

/** GET /admin/users (search by email or name, role and status filters). */
export const usersQueryOptions = (filters: UsersFilters) =>
  queryOptions({
    queryKey: adminKeys.users.list({ ...filters }),
    queryFn: async ({ signal }) =>
      userPageSchema.parse(
        await apiRequest('/admin/users', {
          signal,
          query: { ...filters, page: filters.page ?? 1, pageSize: USERS_PAGE_SIZE },
        }),
      ),
    placeholderData: keepPreviousData,
    ...listQuery,
  });

export const userQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: adminKeys.users.detail(userId),
    queryFn: async ({ signal }) =>
      userSchema.parse(await apiRequest(`/admin/users/${userId}`, { signal })),
    ...listQuery,
  });

const roleResultSchema = z.object({ user: userSchema, claimSynced: z.boolean() });
const statusResultSchema = z.object({ user: userSchema, sessionsRevoked: z.boolean() });

function useAfterUserChange(userId: string) {
  const queryClient = useQueryClient();
  return (user: User | undefined) => {
    if (user) queryClient.setQueryData(adminKeys.users.detail(userId), user);
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.users.all() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.analytics.all() }),
      // In case the change concerns the signed-in admin (the server refuses that, but be safe).
      queryClient.invalidateQueries({ queryKey: meKeys.me }),
    ]);
  };
}

/** PATCH /admin/users/:id/role. `claimSynced: false`: the sign-in claim updates later. */
export function useChangeRole(userId: string) {
  const after = useAfterUserChange(userId);
  return useMutation({
    mutationFn: async (role: Role) =>
      roleResultSchema.parse(
        await apiRequest(`/admin/users/${userId}/role`, { method: 'PATCH', body: { role } }),
      ),
    onSettled: (result) => after(result?.user),
  });
}

/** PATCH /admin/users/:id/status. `sessionsRevoked: false`: open sessions end later. */
export function useChangeStatus(userId: string) {
  const after = useAfterUserChange(userId);
  return useMutation({
    mutationFn: async (status: AccountStatus) =>
      statusResultSchema.parse(
        await apiRequest(`/admin/users/${userId}/status`, { method: 'PATCH', body: { status } }),
      ),
    onSettled: (result) => after(result?.user),
  });
}
