import { COURSE_LIMITS } from './limits';

/**
 * "What you'll learn" is edited as text, one outcome per line, and stored as a list. Empty
 * lines are dropped.
 */
export const toOutcomes = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export const outcomesText = (outcomes: readonly string[]) => outcomes.join('\n');

/** A translation key when the outcomes break the backend's limits, else null. */
export const outcomesProblem = (text: string) => {
  const outcomes = toOutcomes(text);
  if (outcomes.length > COURSE_LIMITS.outcomes) return 'editor:details.errors.tooManyOutcomes';
  if (outcomes.some((outcome) => outcome.length > COURSE_LIMITS.outcome)) {
    return 'editor:details.errors.outcomeTooLong';
  }
  return null;
};
