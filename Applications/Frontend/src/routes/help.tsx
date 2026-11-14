import { createFileRoute } from '@tanstack/react-router';
import { HelpScreen } from '../features/site';

// Open to everyone, signed in or not (linked from the footer).
export const Route = createFileRoute('/help')({
  component: HelpScreen,
});
