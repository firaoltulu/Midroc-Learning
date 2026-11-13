import { createFileRoute } from '@tanstack/react-router';
import { authSearchSchema, LoginScreen, redirectIfSignedIn } from '../features/auth';

export const Route = createFileRoute('/_public/login')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ context, search }) => redirectIfSignedIn({ context, search }),
  component: function LoginRoute() {
    return <LoginScreen search={Route.useSearch()} />;
  },
});
