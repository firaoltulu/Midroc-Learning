import { createFileRoute } from '@tanstack/react-router';
import { DesignScreen } from '../features/design';

// TEMPORARY review route for the shared components.
export const Route = createFileRoute('/design')({
  component: DesignScreen,
});
