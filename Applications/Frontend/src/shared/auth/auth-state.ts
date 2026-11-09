import { getRedirectResult, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { MeApiError, fetchCurrentProfile } from './me-api';
import { firebaseAuth } from './firebase';
import type { UserProfile } from './profile';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; error?: unknown }
  | {
      status: 'signedIn';
      user: User;
      emailVerified: boolean;
      profile: UserProfile | null;
      suspended: boolean;
      profileError?: Error;
    };

type AuthListener = () => void;

let state: AuthState = { status: 'loading' };
let listenerStarted = false;
let generation = 0;
const listeners = new Set<AuthListener>();
const readyWaiters = new Set<(value: AuthState) => void>();

function publish(next: AuthState): void {
  state = next;
  for (const listener of listeners) listener();
  if (next.status !== 'loading') {
    for (const resolve of readyWaiters) resolve(next);
    readyWaiters.clear();
  }
}

export function getAuthState(): AuthState {
  return state;
}

export function subscribeAuthState(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function updateFromFirebaseUser(user: User | null): Promise<void> {
  const currentGeneration = ++generation;
  if (!user) {
    publish({ status: 'signedOut' });
    return;
  }

  if (!user.emailVerified) {
    publish({ status: 'signedIn', user, emailVerified: false, profile: null, suspended: false });
    return;
  }

  publish({ status: 'loading' });
  try {
    const profile = await fetchCurrentProfile(user);
    if (currentGeneration !== generation) return;
    publish({
      status: 'signedIn',
      user,
      emailVerified: true,
      profile,
      suspended: profile.status === 'suspended'
    });
  } catch (error) {
    if (currentGeneration !== generation) return;
    if (error instanceof MeApiError && error.status === 401) {
      try {
        await signOut(firebaseAuth);
      } catch (signOutError) {
        console.error('Unable to clear an invalid Firebase session.', signOutError);
        publish({ status: 'signedOut', error: signOutError });
      }
      return;
    }
    if (error instanceof MeApiError && error.code === 'ACCOUNT_SUSPENDED') {
      publish({ status: 'signedIn', user, emailVerified: true, profile: null, suspended: true });
      return;
    }
    publish({
      status: 'signedIn',
      user,
      emailVerified: true,
      profile: null,
      suspended: false,
      profileError: error instanceof Error ? error : new Error('Unable to load user profile.')
    });
  }
}

export function startAuthSession(): void {
  if (listenerStarted) return;
  listenerStarted = true;
  onAuthStateChanged(firebaseAuth, (user) => {
    void updateFromFirebaseUser(user);
  });
  void getRedirectResult(firebaseAuth).catch((error: unknown) => {
    publish({ status: 'signedOut', error });
  });
}

export function waitForAuthState(): Promise<AuthState> {
  startAuthSession();
  if (state.status !== 'loading') return Promise.resolve(state);
  return new Promise((resolve) => readyWaiters.add(resolve));
}

export async function refreshAuthSession(): Promise<void> {
  await updateFromFirebaseUser(firebaseAuth.currentUser);
}

export function clearAuthError(): void {
  if (state.status === 'signedOut' && state.error) {
    publish({ status: 'signedOut' });
  }
}
