import { useCallback } from 'react';
import { ApiError } from '../../../shared/api/errors';
import { useErrorMessage, useIssueMessage } from '../../../shared/i18n/error-messages';

/**
 * Text for a failed save next to the field: the first validation issue when the server sent
 * some (they describe the field better), otherwise the error code's message.
 */
export function useSaveErrorText() {
  const errorMessage = useErrorMessage();
  const issueMessage = useIssueMessage();
  return useCallback(
    (error: unknown): string | null => {
      if (!error) return null;
      const issue = error instanceof ApiError ? error.issues[0] : undefined;
      return issue ? issueMessage(issue) : errorMessage(error);
    },
    [errorMessage, issueMessage],
  );
}
