import { createFileRoute } from '@tanstack/react-router';
import { SuspendedPage } from '../features/auth/suspended-page';

export const Route = createFileRoute('/_public/suspended')({
  component: SuspendedPage
});
