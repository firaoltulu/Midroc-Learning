import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AdminCourseScreen, type EnrollmentFilters } from '../features/admin/courses';
import { compactSearch, pageNumber, searchText } from '../shared/lib/search-params';

const searchSchema = z.object({ q: searchText(), page: pageNumber() });

export const Route = createFileRoute('/_authenticated/admin/courses/$courseId')({
  validateSearch: searchSchema,
  component: AdminCourseRoute,
});

function AdminCourseRoute() {
  const { courseId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <AdminCourseScreen
      key={courseId}
      courseId={courseId}
      search={search}
      onSearchChange={(next: EnrollmentFilters, options) => {
        void navigate({ search: compactSearch(next), replace: options?.replace ?? false });
      }}
    />
  );
}
