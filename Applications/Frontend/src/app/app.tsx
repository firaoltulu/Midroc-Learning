import { RouterProvider } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { connectAuth, createFirebaseAuthController } from '../features/auth';
import { keepConnected } from './connection';
import { AppProviders } from './providers';
import { createQueryClient } from './query-client';
import { createAppRouter } from './router';

function createApp() {
  const queryClient = createQueryClient();
  const auth = createFirebaseAuthController();
  const router = createAppRouter({ auth, queryClient });
  // Connected at once, before the router's first load: the API client needs the token
  // provider. Every auth change (sign-in, sign-out, verification) re-runs the route guards.
  const connection = keepConnected(() =>
    connectAuth({
      controller: auth,
      queryClient,
      onChange: () => {
        void router.invalidate();
      },
    }),
  );
  return { queryClient, auth, router, connection };
}

export function App() {
  const [app] = useState(createApp);
  // Reconnect on every mount: StrictMode's extra cleanup must not leave requests without
  // the user's token.
  useEffect(() => {
    app.connection.resume();
    return () => {
      app.connection.stop();
    };
  }, [app]);

  return (
    <AppProviders queryClient={app.queryClient} auth={app.auth}>
      <RouterProvider router={app.router} />
    </AppProviders>
  );
}
