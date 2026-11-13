import { createFileRoute } from '@tanstack/react-router';
import { UpcomingScreen } from '../shared/ui/upcoming-screen';

// The editor arrives in phase 9.
export const Route = createFileRoute('/_authenticated/my-courses/$courseId/edit')({
  component: UpcomingScreen,
});
