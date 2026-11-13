import type { AuthoringView } from '../api/schemas';

/**
 * Readiness problems, as the backend reports them in `COURSE_INCOMPLETE.params.problems`
 * (courses.service submitCourse): a description, at least one module, no empty module and no
 * exam without questions.
 */
export const READINESS_PROBLEMS = [
  'DESCRIPTION_REQUIRED',
  'NO_MODULES',
  'EMPTY_MODULE',
  'EMPTY_EXAM',
] as const;

export type ReadinessProblem = (typeof READINESS_PROBLEMS)[number];

export const isReadinessProblem = (value: unknown): value is ReadinessProblem =>
  typeof value === 'string' && (READINESS_PROBLEMS as readonly string[]).includes(value);

/** The checklist computed on the client from the authoring view (same rules as the server). */
export function readinessProblems(view: AuthoringView): ReadinessProblem[] {
  const problems: ReadinessProblem[] = [];
  if (!view.course.description.trim()) problems.push('DESCRIPTION_REQUIRED');
  if (view.modules.length === 0) problems.push('NO_MODULES');
  if (view.modules.some((module) => module.items.length === 0)) problems.push('EMPTY_MODULE');
  const exams = view.modules.flatMap((module) => module.items).filter((i) => i.type === 'exam');
  if (exams.some((exam) => (exam.questions ?? []).length === 0)) problems.push('EMPTY_EXAM');
  return problems;
}

/** `params.problems` of a COURSE_INCOMPLETE error, keeping only the problems we know. */
export function problemsFromParams(params: Record<string, unknown> | undefined) {
  const raw = params?.problems;
  return Array.isArray(raw) ? raw.filter(isReadinessProblem) : [];
}
