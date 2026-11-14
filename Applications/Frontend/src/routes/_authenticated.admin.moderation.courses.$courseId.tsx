import { createFileRoute } from '@tanstack/react-router';
import { CourseReviewScreen } from '../features/admin/moderation';

export const Route = createFileRoute('/_authenticated/admin/moderation/courses/$courseId')({
  component: CourseReviewRoute,
});

function CourseReviewRoute() {
  const { courseId } = Route.useParams();
  return <CourseReviewScreen key={courseId} courseId={courseId} />;
}
