import { createFileRoute } from '@tanstack/react-router';
import { HomeScreen } from '../features/catalog';

export const Route = createFileRoute('/_authenticated/')({
  component: HomeScreen,
});
