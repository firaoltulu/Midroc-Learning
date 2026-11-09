import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
  reload
} from 'firebase/auth';
import { assertFirebaseConfiguration, firebaseAuth, googleProvider } from './firebase';

export async function signInWithEmail(email: string, password: string): Promise<void> {
  assertFirebaseConfiguration();
  await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
}

export async function createAccount(name: string, email: string, password: string): Promise<void> {
  assertFirebaseConfiguration();
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
  if (name.trim()) {
    await updateProfile(credential.user, { displayName: name.trim() });
  }
  await sendEmailVerification(credential.user);
}

export async function sendPasswordReset(email: string): Promise<void> {
  assertFirebaseConfiguration();
  await sendPasswordResetEmail(firebaseAuth, email.trim());
}

export async function sendVerificationEmail(): Promise<void> {
  assertFirebaseConfiguration();
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('You must be signed in to verify your email address.');
  await sendEmailVerification(user);
}

export async function refreshVerifiedUser(): Promise<boolean> {
  assertFirebaseConfiguration();
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('No signed-in user is available.');
  await reload(user);
  return user.emailVerified;
}

export async function signInWithGoogle(): Promise<'signedIn' | 'redirecting'> {
  assertFirebaseConfiguration();
  try {
    await signInWithPopup(firebaseAuth, googleProvider);
    return 'signedIn';
  } catch (error) {
    const code = getFirebaseErrorCode(error);
    if (
      code !== 'auth/popup-blocked' &&
      code !== 'auth/operation-not-supported-in-this-environment'
    ) {
      throw error;
    }
    await signInWithRedirect(firebaseAuth, googleProvider);
    return 'redirecting';
  }
}

export function getFirebaseErrorCode(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }
  return undefined;
}
