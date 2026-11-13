import { RouterProvider } from '@tanstack/react-router';
import { useState } from 'react';
import { AppProviders } from './providers';
import { createQueryClient } from './query-client';
import { createAppRouter } from './router';

export function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(createAppRouter);

  return (
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
