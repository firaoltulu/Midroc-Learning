import type { User } from 'firebase/auth';
import { describe, expect, it } from 'vitest';
import {
  decideAdminRoute,
  decideAuthenticatedRoute,
  decidePublicRoute,
  safeReturnPath
} from '../shared/auth/route-guards';
import type { AuthState } from '../shared/auth/auth-state';

const user = { uid: 'firebase-user', emailVerified: true } as User;
const profile = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'learner@example.com',
  name: 'Learner',
  role: 'user',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z'
} as const;

function signedIn(overrides: Partial<Extract<AuthState, { status: 'signedIn' }>> = {}): AuthState {
  return {
    status: 'signedIn',
    user,
    emailVerified: true,
    profile,
    suspended: false,
    ...overrides
  };
}

describe('route guards', () => {
  it('waits for the initial auth check rather than rendering protected content', () => {
    expect(decideAuthenticatedRoute({ status: 'loading' }, '/account')).toEqual({ type: 'wait' });
    expect(decidePublicRoute({ status: 'loading' }, '/login')).toEqual({ type: 'wait' });
  });

  it('redirects signed-out users to login with a safe return path', () => {
    expect(decideAuthenticatedRoute({ status: 'signedOut' }, '/courses?category=design')).toEqual({
      type: 'redirect',
      href: '/login?redirect=%2Fcourses%3Fcategory%3Ddesign'
    });
  });

  it('allows unverified users only on the verification screen', () => {
    const state = signedIn({ emailVerified: false, profile: null });
    expect(decideAuthenticatedRoute(state, '/account')).toEqual({
      type: 'redirect',
      href: '/verify-email'
    });
    expect(decidePublicRoute(state, '/verify-email')).toEqual({ type: 'allow' });
  });

  it('routes suspended accounts to the suspension screen', () => {
    const state = signedIn({ profile: null, suspended: true });
    expect(decideAuthenticatedRoute(state, '/account')).toEqual({
      type: 'redirect',
      href: '/suspended'
    });
    expect(decidePublicRoute(state, '/suspended')).toEqual({ type: 'allow' });
  });

  it('allows active users into the account and denies non-admins the admin route', () => {
    expect(decideAuthenticatedRoute(signedIn(), '/account')).toEqual({ type: 'allow' });
    expect(decideAdminRoute(signedIn())).toEqual({ type: 'redirect', href: '/account' });
  });

  it('allows admins and rejects unsafe return URLs', () => {
    expect(decideAdminRoute(signedIn({ profile: { ...profile, role: 'admin' } }))).toEqual({
      type: 'allow'
    });
    expect(safeReturnPath('//example.com')).toBeUndefined();
    expect(safeReturnPath('/\\example.com')).toBeUndefined();
    expect(safeReturnPath('/login')).toBeUndefined();
  });
});
