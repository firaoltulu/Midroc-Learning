import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { firebaseAuth } from './firebase';
import {
  clearAuthError,
  getAuthState,
  refreshAuthSession,
  startAuthSession,
  subscribeAuthState,
  type AuthState
} from './auth-state';

interface AuthContextValue {
  state: AuthState;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const state = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState);

  useEffect(() => {
    startAuthSession();
  }, []);

  useEffect(() => {
    if (state.status === 'signedOut') queryClient.clear();
  }, [queryClient, state.status]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      signOut: async () => {
        await firebaseSignOut(firebaseAuth);
        queryClient.clear();
      },
      refreshProfile: refreshAuthSession,
      clearError: clearAuthError
    }),
    [queryClient, state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider.');
  return context;
}
