import { createRouter } from '@tanstack/react-router';
import { routeTree } from '../routeTree.gen';
import { NotFoundScreen } from './not-found-screen';
import { RouteErrorScreen } from './route-error-screen';

export function createAppRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    // Rendered inside the app shell, in place of the failing / missing route.
    defaultErrorComponent: RouteErrorScreen,
    defaultNotFoundComponent: NotFoundScreen,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
