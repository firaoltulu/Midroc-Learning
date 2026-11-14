/**
 * Field limits from openapi.yaml (CourseCreate/CoursePatch, ModuleCreate, ItemCreate,
 * ExamSettings), checked on the client before saving. Validators return a translation key.
 */
export const COURSE_LIMITS = {
  title: 200,
  description: 20_000,
  category: 100,
  tags: 30,
  tag: 40,
  outcomes: 12,
  outcome: 200,
  skills: 20,
  skill: 40,
} as const;

export const TITLE_MAX = 200;
export const MODULE_DESCRIPTION_MAX = 4000;
export const INSTRUCTIONS_MAX = 4000;

/** Module and item titles: required, at most 200 characters. */
export const titleProblem = (value: string) =>
  !value.trim()
    ? 'editor:field.titleRequired'
    : value.length > TITLE_MAX
      ? 'editor:field.tooLong'
      : null;

export const tooLong = (max: number) => (value: string) =>
  value.length > max ? 'editor:field.tooLong' : null;
