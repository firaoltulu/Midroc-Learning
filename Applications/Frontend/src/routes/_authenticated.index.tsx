import { createFileRoute } from '@tanstack/react-router';
import { HomeScreen } from '../features/catalog';

// The home page: hero with "Continue learning", new and popular courses, categories.
export const Route = createFileRoute('/_authenticated/')({
  staticData: { layout: 'fullBleed' },
  component: HomeScreen,
});
