/** Firebase Auth error codes we explain specifically; everything else gets a generic message. */
const KNOWN = {
  'auth/invalid-credential': 'invalidCredential',
  'auth/wrong-password': 'invalidCredential',
  'auth/user-not-found': 'invalidCredential',
  'auth/invalid-email': 'invalidEmail',
  'auth/email-already-in-use': 'emailInUse',
  'auth/weak-password': 'weakPassword',
  'auth/too-many-requests': 'tooManyRequests',
  'auth/network-request-failed': 'network',
  'auth/user-disabled': 'userDisabled',
  'auth/popup-closed-by-user': 'cancelled',
  'auth/cancelled-popup-request': 'cancelled',
  'auth/account-exists-with-different-credential': 'differentCredential',
} as const;

export type AuthErrorKey = (typeof KNOWN)[keyof typeof KNOWN] | 'generic';

export function authErrorKey(error: unknown): AuthErrorKey {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  return code in KNOWN ? KNOWN[code as keyof typeof KNOWN] : 'generic';
}
