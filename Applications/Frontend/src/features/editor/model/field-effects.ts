/**
 * Published courses: which edits apply right away (saved directly, "minor") and which need
 * an administrator's review (kept in the working copy and submitted as a revision, "major").
 * The one list both the labels and the save routing read. It follows the backend's
 * FIELD_POLICY (courses) and which PATCHes it allows on published content.
 */
export type FieldEffect = 'immediate' | 'review';

export const FIELD_EFFECTS = {
  course: {
    title: 'review',
    description: 'review',
    category: 'review',
    language: 'review',
    thumbnailUrl: 'immediate',
    tags: 'immediate',
    estimatedDurationMinutes: 'immediate',
    level: 'immediate',
    outcomes: 'immediate',
    skills: 'immediate',
  },
  module: {
    title: 'immediate',
    description: 'immediate',
  },
  item: {
    title: 'immediate',
    video: 'review',
    file: 'review',
    examSettings: 'review',
    questions: 'review',
  },
} as const satisfies Record<string, Record<string, FieldEffect>>;

type Effects = typeof FIELD_EFFECTS;

/**
 * The effect of editing `field`. A module or item that isn't live yet (no id) only exists in
 * the working copy, so everything about it goes through review.
 */
export function fieldEffect<T extends keyof Effects>(
  target: T,
  field: keyof Effects[T],
  isNew = false,
): FieldEffect {
  return isNew ? 'review' : (FIELD_EFFECTS[target][field] as FieldEffect);
}
