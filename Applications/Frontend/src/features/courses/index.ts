// Public API of the courses feature (course detail, enrollment). Routes and other features
// import only from here.

export { CourseDetailScreen } from './screens/course-detail-screen';

// For the catalog and learning features
export {
  catalogCourseSchema,
  catalogPageSchema,
  courseLanguageSchema,
  type CatalogCourse,
  type CatalogPage,
  type CourseLanguage,
} from './api/schemas';
export { CourseMeta } from './components/course-meta';
