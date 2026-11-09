import { createFileRoute } from '@tanstack/react-router';
import { VerifyEmailPage } from '../features/auth/verify-email-page';

export const Route = createFileRoute('/_public/verify-email')({
  component: VerifyEmailPage
});
