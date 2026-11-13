import { createFileRoute } from '@tanstack/react-router';
import { AdminHomeScreen } from '../features/admin/dashboard';

export const Route = createFileRoute('/_authenticated/admin/')({
  component: AdminHomeScreen,
});
