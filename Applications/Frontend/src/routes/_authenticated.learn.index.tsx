import { createFileRoute } from '@tanstack/react-router';
import { LearningScreen } from '../features/learning';

export const Route = createFileRoute('/_authenticated/learn/')({
  component: LearningScreen,
});
