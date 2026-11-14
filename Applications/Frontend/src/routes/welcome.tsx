import { createFileRoute } from '@tanstack/react-router';
import { redirectIfSignedIn } from '../features/auth';
import { GuestHomeScreen } from '../features/catalog';

// The home page before sign-in (signed-out visitors to / land here). Signed-in users go home.
export const Route = createFileRoute('/welcome')({
  staticData: { layout: 'fullBleed' },
  beforeLoad: ({ context }) => redirectIfSignedIn({ context, search: {} }),
  component: GuestHomeScreen,
});
