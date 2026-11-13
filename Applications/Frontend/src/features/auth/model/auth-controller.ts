import type { AuthState, SettledAuthState, SignOutReason } from './auth-state';

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Everything the app needs from the identity provider. The Firebase implementation lives in
 * firebase/firebase-auth.ts; tests use a fake with the same shape. Members are plain
 * functions (no `this`), so they can be passed around freely (e.g. to useSyncExternalStore).
 */
export interface AuthController {
  getState: () => AuthState;
  subscribe: (listener: () => void) => () => void;
  /** Waits until the initial auth state is known (never resolves with 'loading'). */
  ready: () => Promise<SettledAuthState>;

  /** Current ID token (cached and refreshed by the SDK); `force` mints a new one. */
  getIdToken: (force?: boolean) => Promise<string | null>;

  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (input: SignUpInput) => Promise<void>;
  /** Popup first; falls back to a full-page redirect when popups are blocked or unsuitable. */
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  /** Re-reads the user (e.g. after verifying the email elsewhere) and publishes the change. */
  reloadUser: () => Promise<void>;
  /**
   * Signs out. A `reason` stays on the signed-out state, so whichever guard sends the user
   * to /login can explain why (e.g. a suspended account).
   */
  signOut: (options?: { reason?: SignOutReason }) => Promise<void>;

  /** An error from a completed redirect sign-in, reported once. */
  takeRedirectError: () => unknown;
}
