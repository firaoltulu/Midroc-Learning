import { createFileRoute } from '@tanstack/react-router';
import { AdminPage } from '../features/auth/admin-page';

export const Route = createFileRoute('/_authenticated/admin/')({
  component: AdminPage
});
