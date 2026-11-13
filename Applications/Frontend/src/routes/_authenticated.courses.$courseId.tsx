import { createFileRoute } from '@tanstack/react-router';
import { CourseDetailScreen } from '../features/courses';

export const Route = createFileRoute('/_authenticated/courses/$courseId')({
  component: CourseDetailRoute,
});

function CourseDetailRoute() {
  const { courseId } = Route.useParams();
  // Keyed so switching courses starts from a clean screen (dialogs, errors).
  return <CourseDetailScreen key={courseId} courseId={courseId} />;
}
