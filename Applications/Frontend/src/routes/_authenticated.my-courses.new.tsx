import { createFileRoute } from '@tanstack/react-router';
import { UpcomingScreen } from '../shared/ui/upcoming-screen';

// Course creation arrives in phase 9.
export const Route = createFileRoute('/_authenticated/my-courses/new')({
  component: UpcomingScreen,
});
