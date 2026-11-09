import { z } from 'zod';

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: z.enum(['user', 'admin']),
  status: z.enum(['active', 'suspended']),
  createdAt: z.string().datetime({ offset: true }).or(z.string().date())
});

export type UserProfile = z.infer<typeof userProfileSchema>;
