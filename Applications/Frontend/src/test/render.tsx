import { QueryClient } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  type AnyRouter,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { AppProviders } from '../app/providers';
import { connectAuth, type Me } from '../features/auth';
import { createFakeAuthController, passwordUser } from '../features/auth/testing';
import { adminFixture, meFixture } from './fixtures';
import { setMe } from './msw';

export type SignedInAs = 'user' | 'admin' | 'unverified' | 'signedOut' | 'loading';

export interface RenderOptions {
  /** Who is signed in (default: a verified learner). /me answers accordingly. */
  as?: SignedInAs;
  /** Overrides for the /me profile. */
  me?: Partial<Me>;
  /** Initial URL (search params included), e.g. '/courses?page=2'. */
  path?: string;
}

/** Same defaults as the app, minus retries and garbage collection (deterministic tests). */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
}

/**
 * Renders `ui` inside the app's real providers (theme, Query, auth, toasts), a memory router
 * at `path`, and a fake signed-in session wired to the API client (Bearer token, 401 handling).
 * The API is mocked with MSW (src/test/msw.ts).
 *
 *   const { user, auth } = await renderWithProviders(<CatalogScreen />, { as: 'admin' });
 */
export async function renderWithProviders(ui: ReactNode, options: RenderOptions = {}) {
  const { as = 'user', path = '/' } = options;
  const queryClient = createTestQueryClient();
  const auth = createFakeAuthController();

  if (as === 'admin') {
    setMe(adminFixture(options.me));
    auth.signIn(passwordUser({ uid: 'admin-uid', email: 'admin@example.com' }));
  } else if (as === 'user' || as === 'unverified') {
    setMe(meFixture(options.me));
    auth.signIn(passwordUser({ emailVerified: as === 'user' }));
  } else if (as === 'signedOut') {
    auth.signOutNow();
  }

  const disconnect = connectAuth({ controller: auth.controller, queryClient });
  onTestFinished(() => {
    disconnect();
    queryClient.clear();
  });

  // The root renders `ui`; a catch-all child accepts any `path`.
  const rootRoute = createRootRoute({ component: () => ui });
  const anyPath = createRoute({ getParentRoute: () => rootRoute, path: '$' });
  const router: AnyRouter = createRouter({
    routeTree: rootRoute.addChildren([anyPath]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();

  const user = userEvent.setup();
  const view = render(
    <AppProviders queryClient={queryClient} auth={auth.controller}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...view, user, auth, queryClient, router };
}
