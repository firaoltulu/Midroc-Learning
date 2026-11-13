import type { QueryClient } from '@tanstack/react-query';
import { configureApiAuth } from '../../shared/api/client';
import { authKeys } from './api/keys';
import type { AuthController } from './model/auth-controller';
import type { AuthState } from './model/auth-state';
import { clearUserData } from './lib/user-data';

const uidOf = (state: AuthState) => (state.status === 'signedIn' ? state.user.uid : null);

/**
 * Wires auth into the app. Call once at startup, before the router loads (it must be
 * synchronous: React runs child effects before parent effects, so an effect would be late).
 * - The API client sends this user's ID token and handles `X-Token-Refresh`
 *   (force a new token, then refetch /me).
 * - When a session ends (sign-out, revoked session, or a different user signs in), the query
 *   cache and per-user local data are cleared.
 * - `onChange` runs after every auth change (the app re-runs route guards there).
 */
export function connectAuth({
  controller,
  queryClient,
  onChange,
}: {
  controller: AuthController;
  queryClient: QueryClient;
  onChange?: () => void;
}): () => void {
  configureApiAuth({
    getToken: (force) => controller.getIdToken(force),
    onTokenRefresh: async () => {
      await controller.getIdToken(true);
      await queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });

  let previous = uidOf(controller.getState());
  const unsubscribe = controller.subscribe(() => {
    const current = uidOf(controller.getState());
    if (previous !== null && current !== previous) {
      queryClient.clear();
      clearUserData();
    }
    previous = current;
    onChange?.();
  });

  return () => {
    unsubscribe();
    configureApiAuth(null);
  };
}
