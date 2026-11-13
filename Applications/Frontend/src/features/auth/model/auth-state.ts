/** The parts of the Firebase user the app relies on (a plain snapshot, safe to compare). */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  /** Firebase provider ids, e.g. 'password', 'google.com'. */
  providerIds: string[];
}

/** Why the app signed the user out, when it did so itself (shown on the login page). */
export type SignOutReason = 'suspended';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; reason?: SignOutReason }
  | { status: 'signedIn'; user: AuthUser };

export type SettledAuthState = Exclude<AuthState, { status: 'loading' }>;

/**
 * Password accounts must verify their email; Google accounts are treated as verified.
 */
export function isVerified(user: AuthUser): boolean {
  return user.emailVerified || user.providerIds.includes('google.com');
}

/** A tiny observable holding the auth state, shared by the Firebase and test controllers. */
export function createAuthStore() {
  let state: AuthState = { status: 'loading' };
  const listeners = new Set<() => void>();
  let settle: ((value: SettledAuthState) => void) | null = null;
  let settled = new Promise<SettledAuthState>((resolve) => {
    settle = resolve;
  });

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Resolves with the first non-loading state (immediately once known). */
    ready: () => settled,
    set: (next: SettledAuthState) => {
      state = next;
      if (settle) {
        settle(next);
        settle = null;
      } else {
        settled = Promise.resolve(next);
      }
      listeners.forEach((listener) => {
        listener();
      });
    },
  };
}
