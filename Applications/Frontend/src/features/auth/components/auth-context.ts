import { useNavigate } from '@tanstack/react-router';
import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import type { AuthController } from '../model/auth-controller';
import type { AuthState } from '../model/auth-state';

export const AuthContext = createContext<AuthController | null>(null);

export function useAuthController(): AuthController {
  const controller = useContext(AuthContext);
  if (!controller) throw new Error('useAuthController must be used inside <AuthProvider>');
  return controller;
}

/** `{ status: 'loading' | 'signedOut' | 'signedIn', user }`, re-rendering on change. */
export function useAuth(): AuthState {
  const controller = useAuthController();
  return useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
}

/** Signs out (AuthProvider clears the query cache and per-user data) and goes to /login. */
export function useSignOut() {
  const controller = useAuthController();
  const navigate = useNavigate();
  return useCallback(async () => {
    await controller.signOut();
    await navigate({ to: '/login' });
  }, [controller, navigate]);
}
