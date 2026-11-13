import type { AuthController } from '../model/auth-controller';
import { createAuthStore, type AuthUser, type SignOutReason } from '../model/auth-state';

export const passwordUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  uid: 'uid-1',
  email: 'learner@example.com',
  displayName: 'Learner',
  emailVerified: true,
  providerIds: ['password'],
  ...overrides,
});

/**
 * In-memory AuthController for tests: starts 'loading'; drive it with signIn/signOutNow.
 * Every action is a vi.fn so tests can assert calls or make them fail.
 */
export function createFakeAuthController() {
  const store = createAuthStore();

  const controller = {
    getState: store.getState,
    subscribe: store.subscribe,
    ready: store.ready,
    getIdToken: vi.fn((force?: boolean) =>
      Promise.resolve(
        store.getState().status === 'signedIn' ? (force ? 'token-2' : 'token-1') : null,
      ),
    ),
    signInWithPassword: vi.fn(() => Promise.resolve()),
    signUpWithPassword: vi.fn(() => Promise.resolve()),
    signInWithGoogle: vi.fn(() => Promise.resolve()),
    sendPasswordReset: vi.fn(() => Promise.resolve()),
    sendVerificationEmail: vi.fn(() => Promise.resolve()),
    reloadUser: vi.fn(() => Promise.resolve()),
    signOut: vi.fn((options?: { reason?: SignOutReason }) => {
      store.set(
        options?.reason ? { status: 'signedOut', reason: options.reason } : { status: 'signedOut' },
      );
      return Promise.resolve();
    }),
    takeRedirectError: vi.fn(() => null),
  } satisfies AuthController;

  return {
    controller,
    signIn(user: AuthUser = passwordUser()) {
      store.set({ status: 'signedIn', user });
    },
    signOutNow() {
      store.set({ status: 'signedOut' });
    },
  };
}
