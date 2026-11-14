// Public API of the courses feature (course detail, enrollment). Routes and other features
// import only from here.

export { CourseDetailScreen } from './screens/course-detail-screen';

// For the catalog and learning features
export {
  catalogCourseSchema,
  catalogPageSchema,
  courseDetailSchema,
  courseLanguageSchema,
  courseLevelSchema,
  courseSchema,
  itemTypeSchema,
  type CatalogCourse,
  type CatalogPage,
  type Course,
  type CourseDetail,
  type CourseLanguage,
  type CourseLevel,
  type CourseStatus,
  type ItemType,
} from './api/schemas';
export { courseDetailQueryOptions } from './api/course-detail';
export { CourseMeta } from './components/course-meta';
export { nextItemId } from './model/course-action';
export { ITEM_ICONS } from './components/item-icons';
