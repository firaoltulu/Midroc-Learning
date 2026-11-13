import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AppThemeProvider } from '../shared/theme/theme-provider';
import { ToastProvider } from '../shared/ui/toast/toast-provider';

/** Theme, Query and toasts. Phase 3 adds I18n and phase 4 Auth. The router sits inside. */
export function AppProviders({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <AppThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </AppThemeProvider>
  );
}
