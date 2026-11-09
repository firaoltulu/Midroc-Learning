import { createFileRoute } from '@tanstack/react-router';
import { ForgotPasswordPage } from '../features/auth/forgot-password-page';

export const Route = createFileRoute('/_public/forgot-password')({
  component: ForgotPasswordPage
});
