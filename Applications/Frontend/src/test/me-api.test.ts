import type { User } from 'firebase/auth';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchCurrentProfile } from '../shared/auth/me-api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('current-user API', () => {
  it('sends a Firebase bearer token and refreshes claims when requested', async () => {
    const getIdToken = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('initial-token')
      .mockResolvedValueOnce('refreshed-token');
    const user = { getIdToken } as unknown as User;
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'learner@example.com',
          name: 'Learner',
          role: 'admin',
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'X-Token-Refresh': 'true' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const profile = await fetchCurrentProfile(user);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/me',
      expect.objectContaining({
        headers: { Authorization: 'Bearer initial-token' }
      })
    );
    expect(getIdToken).toHaveBeenNthCalledWith(2, true);
    expect(profile.role).toBe('admin');
  });
});
