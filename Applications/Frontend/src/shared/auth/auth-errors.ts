import enAuth from '../../locales/en/auth.json';
import { getFirebaseErrorCode } from './auth-operations';

export type AuthErrorKey = keyof typeof enAuth.errors;

export function getAuthErrorKey(error: unknown): AuthErrorKey {
  const code = getFirebaseErrorCode(error);
  if (code === 'auth/invalid-email') return 'invalidEmail';
  if (code === 'auth/email-already-in-use') return 'emailInUse';
  if (code === 'auth/weak-password') return 'weakPassword';
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'invalidCredentials';
  }
  if (code === 'auth/network-request-failed') return 'network';
  return 'generic';
}
