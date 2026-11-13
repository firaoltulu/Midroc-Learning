import { createRouter } from '@tanstack/react-router';
import { routeTree } from '../routeTree.gen';
import { NotFoundScreen } from './not-found-screen';
import { PendingScreen } from './pending-screen';
import { RouteErrorScreen } from './route-error-screen';
import type { RouterContext } from './router-context';

export function createAppRouter(context: RouterContext) {
  return createRouter({
    routeTree,
    context,
    defaultPreload: 'intent',
    scrollRestoration: true,
    // Rendered inside the app shell, in place of the failing / missing / loading route.
    defaultErrorComponent: RouteErrorScreen,
    defaultNotFoundComponent: NotFoundScreen,
    defaultPendingComponent: PendingScreen,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
