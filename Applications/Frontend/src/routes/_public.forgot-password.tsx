import { createFileRoute } from '@tanstack/react-router';
import { authSearchSchema, ForgotPasswordScreen, redirectIfSignedIn } from '../features/auth';

export const Route = createFileRoute('/_public/forgot-password')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ context, search }) => redirectIfSignedIn({ context, search }),
  component: function ForgotPasswordRoute() {
    return <ForgotPasswordScreen search={Route.useSearch()} />;
  },
});
