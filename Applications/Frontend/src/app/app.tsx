import { RouterProvider } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { connectAuth, createFirebaseAuthController } from '../features/auth';
import { AppProviders } from './providers';
import { createQueryClient } from './query-client';
import { createAppRouter } from './router';

function createApp() {
  const queryClient = createQueryClient();
  const auth = createFirebaseAuthController();
  const router = createAppRouter({ auth, queryClient });
  // Synchronous, before the router's first load: the API client needs the token provider.
  // Every auth change (sign-in, sign-out, verification) re-runs the route guards.
  const disconnect = connectAuth({
    controller: auth,
    queryClient,
    onChange: () => {
      void router.invalidate();
    },
  });
  return { queryClient, auth, router, disconnect };
}

export function App() {
  const [app] = useState(createApp);
  useEffect(() => app.disconnect, [app]);

  return (
    <AppProviders queryClient={app.queryClient} auth={app.auth}>
      <RouterProvider router={app.router} />
    </AppProviders>
  );
}
