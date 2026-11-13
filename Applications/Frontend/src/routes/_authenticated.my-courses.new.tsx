import { createFileRoute } from '@tanstack/react-router';
import { NewCourseScreen } from '../features/my-courses';

export const Route = createFileRoute('/_authenticated/my-courses/new')({
  component: NewCourseScreen,
});
