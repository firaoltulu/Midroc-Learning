import { createFileRoute, redirect } from '@tanstack/react-router';

// The catalog is the home page.
export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: () => {
    throw redirect({ to: '/courses', replace: true });
  },
});
