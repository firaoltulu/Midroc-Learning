import type { User } from 'firebase/auth';
import { env } from '../config/env';
import { userProfileSchema, type UserProfile } from './profile';

export class MeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'MeApiError';
  }
}

async function readError(response: Response): Promise<{ error?: string; code?: string }> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return {};
    const record = body as Record<string, unknown>;
    return {
      error: typeof record.error === 'string' ? record.error : undefined,
      code: typeof record.code === 'string' ? record.code : undefined
    };
  } catch {
    return {};
  }
}

export async function fetchCurrentProfile(user: User): Promise<UserProfile> {
  const token = await user.getIdToken();
  let response: Response;
  try {
    response = await fetch(`${env.VITE_API_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error) {
    throw new MeApiError('Unable to reach the profile service.', 0, 'NETWORK_ERROR', {
      cause: error
    });
  }

  if (response.headers.get('X-Token-Refresh')?.toLowerCase() === 'true') {
    await user.getIdToken(true);
  }

  if (!response.ok) {
    const { error, code } = await readError(response);
    if (response.status === 403 && error?.toLowerCase().includes('suspended')) {
      throw new MeApiError(error, response.status, 'ACCOUNT_SUSPENDED');
    }
    throw new MeApiError(
      error ?? 'Unable to load the current user profile.',
      response.status,
      code
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new MeApiError('The profile service returned invalid data.', 502, 'INVALID_RESPONSE', {
      cause: error
    });
  }
  const profile = userProfileSchema.safeParse(body);
  if (!profile.success) {
    throw new MeApiError(
      'The profile service returned an unexpected user profile.',
      502,
      'INVALID_RESPONSE'
    );
  }
  return profile.data;
}
