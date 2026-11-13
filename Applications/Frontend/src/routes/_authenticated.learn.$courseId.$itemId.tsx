import { createFileRoute } from '@tanstack/react-router';
import { UpcomingScreen } from '../shared/ui/upcoming-screen';

// The player arrives in phase 7.
export const Route = createFileRoute('/_authenticated/learn/$courseId/$itemId')({
  component: UpcomingScreen,
});
