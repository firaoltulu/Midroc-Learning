import { createRootRoute, Outlet } from '@tanstack/react-router';

// Phase 2 replaces this with the app shell (top bar, drawer, skip link, error boundary).
export const Route = createRootRoute({
  component: Outlet,
});
