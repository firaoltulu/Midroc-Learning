import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import { i18n } from '../../../shared/i18n/setup';
import { env } from '../../../shared/lib/env';
import type { AuthController } from '../model/auth-controller';
import { createAuthStore, type AuthUser, type SignOutReason } from '../model/auth-state';

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
    providerIds: user.providerData.map((profile) => profile.providerId),
  };
}

/** Popups are unreliable on iOS Safari (and in-app browsers); go straight to redirect there. */
function prefersRedirect(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return iOS;
}

const POPUP_UNAVAILABLE = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined;
}

export function createFirebaseAuthController(): AuthController {
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  // Persistence: local (IndexedDB, falling back to localStorage). The SDK owns the tokens.
  const auth: Auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  if (env.VITE_FIREBASE_EMULATOR) {
    connectAuthEmulator(auth, `http://${env.VITE_FIREBASE_EMULATOR}`, { disableWarnings: true });
  }

  // Emails Firebase sends (verification, reset) follow the interface language.
  auth.languageCode = i18n.language;
  i18n.on('languageChanged', (language) => {
    auth.languageCode = language;
  });

  const store = createAuthStore();
  let signOutReason: SignOutReason | undefined;
  // While sign-up finishes (profile name, verification email) the new user is not published,
  // so the guards don't move on to /verify-email before the email has been sent.
  let holdPublishing = false;
  let signingOut: Promise<void> | null = null;
  const publish = (user: User | null) => {
    if (holdPublishing) return;
    if (user) {
      signOutReason = undefined;
      store.set({ status: 'signedIn', user: toAuthUser(user) });
    } else {
      store.set(
        signOutReason ? { status: 'signedOut', reason: signOutReason } : { status: 'signedOut' },
      );
    }
  };
  onAuthStateChanged(auth, publish);

  let redirectError: unknown = null;
  getRedirectResult(auth).catch((error: unknown) => {
    redirectError = error;
  });

  const requireUser = () => {
    if (!auth.currentUser) throw new Error('No signed-in user');
    return auth.currentUser;
  };

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    ready: store.ready,

    async getIdToken(force = false) {
      return auth.currentUser ? auth.currentUser.getIdToken(force) : null;
    },

    async signInWithPassword(email, password) {
      await signInWithEmailAndPassword(auth, email, password);
    },

    async signUpWithPassword({ name, email, password }) {
      holdPublishing = true;
      try {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await updateProfile(user, { displayName: name });
          await sendEmailVerification(user);
        } catch {
          // The account exists and is signed in: carry on to /verify-email, where the
          // learner can resend the email. Failing here would strand them on the sign-up form.
        }
      } finally {
        holdPublishing = false;
        // Also publishes the display name (updateProfile doesn't fire onAuthStateChanged).
        publish(auth.currentUser);
      }
    },

    async signInWithGoogle() {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      if (prefersRedirect()) {
        await signInWithRedirect(auth, provider);
        return;
      }
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        if (POPUP_UNAVAILABLE.has(errorCode(error) ?? '')) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw error;
      }
    },

    async sendPasswordReset(email) {
      await sendPasswordResetEmail(auth, email);
    },

    async sendVerificationEmail() {
      await sendEmailVerification(requireUser());
    },

    async reloadUser() {
      const user = requireUser();
      await reload(user);
      // A fresh token carries the new email_verified claim to the backend.
      await user.getIdToken(true);
      publish(auth.currentUser);
    },

    signOut(options = {}) {
      // One sign-out at a time: the API client and a route guard may both react to the
      // same suspension.
      signingOut ??= (async () => {
        signOutReason = options.reason;
        await signOut(auth);
      })().finally(() => {
        signingOut = null;
      });
      return signingOut;
    },

    takeRedirectError() {
      const error = redirectError;
      redirectError = null;
      return error;
    },
  };
}
