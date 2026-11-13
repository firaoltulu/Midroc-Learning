import { createFileRoute } from '@tanstack/react-router';
import { authSearchSchema, requireUnverified, VerifyEmailScreen } from '../features/auth';

export const Route = createFileRoute('/_public/verify-email')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ context, search }) => requireUnverified({ context, search }),
  component: function VerifyEmailRoute() {
    const { user } = Route.useRouteContext();
    return <VerifyEmailScreen email={user.email ?? ''} />;
  },
});
