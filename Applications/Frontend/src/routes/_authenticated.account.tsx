import { createFileRoute } from '@tanstack/react-router';
import { AccountPage } from '../features/auth/account-page';

export const Route = createFileRoute('/_authenticated/account')({
  component: AccountPage
});
