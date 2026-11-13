import { useCallback } from 'react';
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { ApiError, type ApiIssue } from '../api/errors';
import { useIssueMessage } from './error-messages';

export interface ApplyIssuesOptions<T extends FieldValues> {
  /** Form fields that can show an error. Issues for other paths are returned as unmatched. */
  fields: readonly FieldPath<T>[];
  /** Server path (dot-joined) → form field, when the names differ. */
  fieldMap?: Partial<Record<string, FieldPath<T>>>;
}

export interface ApplyIssuesResult {
  /** At least one issue was shown on a field (the first one is focused). */
  applied: boolean;
  /** Issues with no matching field: show them in a form-level message. */
  unmatched: ApiIssue[];
}

/**
 * Maps a validation error's `issues[].path` to react-hook-form fields with translated messages:
 *
 *   const applyIssues = useApplyApiIssues<FormValues>();
 *   onError: (error) => {
 *     const { applied } = applyIssues(error, setError, { fields: ['title', 'description'] });
 *     if (!applied) showFormError(error);
 *   }
 */
export function useApplyApiIssues<T extends FieldValues>() {
  const issueMessage = useIssueMessage();

  return useCallback(
    (
      error: unknown,
      setError: UseFormSetError<T>,
      options: ApplyIssuesOptions<T>,
    ): ApplyIssuesResult => {
      if (!(error instanceof ApiError)) return { applied: false, unmatched: [] };
      const known = new Set<string>(options.fields);
      const unmatched: ApiIssue[] = [];
      let applied = false;

      for (const issue of error.issues) {
        const path = issue.path.join('.');
        const field = options.fieldMap?.[path] ?? (known.has(path) ? (path as FieldPath<T>) : null);
        if (!field) {
          unmatched.push(issue);
          continue;
        }
        setError(
          field,
          { type: 'server', message: issueMessage(issue) },
          { shouldFocus: !applied },
        );
        applied = true;
      }
      return { applied, unmatched };
    },
    [issueMessage],
  );
}
