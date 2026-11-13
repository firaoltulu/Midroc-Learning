import type { ReactNode } from 'react';
import type { AuthController } from '../model/auth-controller';
import { AuthContext } from './auth-context';

/** Makes the auth controller available to components (useAuth, useSignOut, ...). */
export function AuthProvider({
  controller,
  children,
}: {
  controller: AuthController;
  children: ReactNode;
}) {
  return <AuthContext.Provider value={controller}>{children}</AuthContext.Provider>;
}
