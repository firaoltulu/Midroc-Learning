import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useState } from 'react';
import { router } from './router';
import { theme } from './theme';
import { LanguageProvider } from '../shared/i18n/language-provider';

export function AppProviders() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <RouterProvider router={router} />
        </LanguageProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
