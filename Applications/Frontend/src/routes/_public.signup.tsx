import { createFileRoute } from '@tanstack/react-router';
import { authSearchSchema, redirectIfSignedIn, SignUpScreen } from '../features/auth';

export const Route = createFileRoute('/_public/signup')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ context, search }) => redirectIfSignedIn({ context, search }),
  component: function SignUpRoute() {
    return <SignUpScreen search={Route.useSearch()} />;
  },
});
