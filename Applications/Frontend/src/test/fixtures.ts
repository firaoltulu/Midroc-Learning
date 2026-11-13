import type { Me } from '../features/auth';

/** Test data in the backend's response shapes. Override only what a test cares about. */

export const meFixture = (overrides: Partial<Me> = {}): Me => ({
  id: 'user-1',
  email: 'learner@example.com',
  name: 'Abebe Kebede',
  role: 'user',
  status: 'active',
  createdAt: '2026-11-01T09:30:00.000Z',
  ...overrides,
});

export const adminFixture = (overrides: Partial<Me> = {}): Me =>
  meFixture({
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'admin',
    ...overrides,
  });

/** The `{ page, pageSize, total, items }` envelope of list endpoints. */
export const pageOf = <T>(
  items: T[],
  overrides: { page?: number; pageSize?: number; total?: number } = {},
) => ({
  page: 1,
  pageSize: 20,
  total: items.length,
  items,
  ...overrides,
});
