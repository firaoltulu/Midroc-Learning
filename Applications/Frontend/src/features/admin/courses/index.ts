// Public API of the admin/courses feature (all courses, per-course analytics and enrollments).
// Routes and other features import only from here.
export { AdminCoursesScreen } from './screens/admin-courses-screen';
export { AdminCourseScreen } from './screens/admin-course-screen';
export type { AdminCoursesFilters, EnrollmentFilters } from './api/admin-courses';

// For moderation (courses awaiting review)
export { adminCourseSchema, type AdminCourse } from './api/admin-courses';
