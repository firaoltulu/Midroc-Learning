import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthProvider, type AuthController } from '../features/auth';
import { AppThemeProvider } from '../shared/theme/theme-provider';
import { ToastProvider } from '../shared/ui/toast/toast-provider';

/**
 * Theme, Query, Auth and toasts. i18n is initialized before render (main.tsx) and reached
 * through react-i18next. The router sits inside.
 */
export function AppProviders({
  queryClient,
  auth,
  children,
}: {
  queryClient: QueryClient;
  auth: AuthController;
  children: ReactNode;
}) {
  return (
    <AppThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider controller={auth}>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppThemeProvider>
  );
}
