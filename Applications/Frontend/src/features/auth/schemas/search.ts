import { z } from 'zod';

/**
 * Search params of the public auth pages. Invalid values are dropped rather than failing the
 * route; `redirect` is additionally sanitized (safeRedirect) before it is ever followed.
 */
export const authSearchSchema = z.object({
  redirect: z.string().max(2000).optional().catch(undefined),
  reason: z.enum(['suspended', 'sessionExpired']).optional().catch(undefined),
});

export type AuthSearch = z.infer<typeof authSearchSchema>;
