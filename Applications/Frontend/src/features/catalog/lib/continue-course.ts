import type { Enrollment } from '../../learning';

/** The unfinished course the learner touched most recently (for "Continue learning"). */
export function pickContinueCourse(enrollments: Enrollment[]): Enrollment | undefined {
  return enrollments
    .filter((enrollment) => enrollment.progressPercent < 100 && enrollment.currentModule !== null)
    .sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt))[0];
}
