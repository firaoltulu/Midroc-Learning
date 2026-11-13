import { createFileRoute } from '@tanstack/react-router';
import { MyCoursesScreen } from '../features/my-courses';

export const Route = createFileRoute('/_authenticated/my-courses/')({
  component: MyCoursesScreen,
});
