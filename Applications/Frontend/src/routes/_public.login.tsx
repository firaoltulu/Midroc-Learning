import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { LoginPage } from '../features/auth/login-page';

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute('/_public/login')({
  validateSearch: searchSchema,
  component: LoginRoute
});

function LoginRoute() {
  const { redirect } = Route.useSearch();
  return <LoginPage redirectTo={redirect} />;
}
