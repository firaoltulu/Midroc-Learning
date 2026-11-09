import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { env, firebaseEmulatorUrl, isFirebaseConfigured } from '../config/env';

const projectId = env.VITE_FIREBASE_PROJECT_ID ?? 'demo-midroc';
const firebaseApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey: env.VITE_FIREBASE_API_KEY ?? 'demo-api-key',
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
        projectId,
        appId: env.VITE_FIREBASE_APP_ID ?? '1:1234567890:web:midroc-learning'
      });

export const firebaseAuth: Auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

if (firebaseEmulatorUrl && !firebaseAuth.emulatorConfig) {
  connectAuthEmulator(firebaseAuth, firebaseEmulatorUrl, { disableWarnings: true });
}

export function assertFirebaseConfiguration(): void {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase is not configured. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID, or enable VITE_FIREBASE_EMULATOR.'
    );
  }
}
