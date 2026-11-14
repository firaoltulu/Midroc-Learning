import { createFileRoute } from '@tanstack/react-router';
import { PrivacyScreen } from '../features/site';

// Open to everyone, signed in or not (linked from the footer).
export const Route = createFileRoute('/privacy')({
  component: PrivacyScreen,
});
