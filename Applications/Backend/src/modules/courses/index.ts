export { coursesRoutes } from './courses.routes.js';
export { coursesAdminRoutes } from './courses.admin.routes.js';
export { courseLanguageSchema } from './courses.schemas.js';
export {
  FIELD_POLICY,
  applyFields,
  getCourse,
  getCourseForUpdate,
  listAdminCourses,
  listPendingCourses,
  resolveCourseContext,
  reviewCourse
} from './courses.service.js';
export * as coursesApi from './courses.service.js';
export type { Course, CourseFields, CourseLanguage, CourseStatus } from './courses.types.js';
