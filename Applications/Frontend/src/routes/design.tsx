import { createFileRoute } from '@tanstack/react-router';
import { DesignPage } from '../features/design';

export const Route = createFileRoute('/design')({
  component: DesignPage
});
