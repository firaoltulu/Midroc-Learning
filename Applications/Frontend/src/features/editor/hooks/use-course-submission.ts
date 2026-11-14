import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../shared/api/errors';
import { useToast } from '../../../shared/ui/toast/toast-context';
import { useSubmitCourse } from '../api/authoring';
import { problemsFromParams, type ReadinessProblem } from '../model/readiness';
import { useSaveTracker } from '../model/save-tracker';

export interface CourseSubmission {
  submit: () => void;
  pending: boolean;
  /** COURSE_INCOMPLETE: what the server says is missing. */
  serverProblems: ReadinessProblem[] | null;
  /** Another error (shown as text). */
  error: unknown;
  /** Something wasn't saved yet when the author submitted. */
  unsaved: boolean;
  /** The Review tab's result area: focused after a failed submit. */
  resultRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * "Submit for review" for a draft or rejected course, shared by the editor's top bar (the
 * button) and the Review tab (the checklist and the outcome). A failed submit opens the Review
 * tab (`onShowResult`) and moves focus to the outcome; the server has the last word.
 */
export function useCourseSubmission(courseId: string, onShowResult: () => void): CourseSubmission {
  const { t } = useTranslation('editor');
  const toast = useToast();
  const tracker = useSaveTracker();
  const mutation = useSubmitCourse(courseId);
  const [serverProblems, setServerProblems] = useState<ReadinessProblem[] | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const showResult = () => {
    onShowResult();
    // After the tab has rendered.
    requestAnimationFrame(() => resultRef.current?.focus());
  };

  const submit = () => {
    setServerProblems(null);
    if (tracker.hasUnsaved()) {
      setUnsaved(true);
      showResult();
      return;
    }
    setUnsaved(false);
    mutation.mutate(undefined, {
      onSuccess: () => {
        toast.show({ message: t('review.submitted'), severity: 'success' });
      },
      onError: (error) => {
        if (isApiError(error, 'COURSE_INCOMPLETE')) {
          setServerProblems(problemsFromParams(error.params));
        }
        showResult();
      },
    });
  };

  return {
    submit,
    pending: mutation.isPending,
    serverProblems,
    error:
      mutation.error && !isApiError(mutation.error, 'COURSE_INCOMPLETE') ? mutation.error : null,
    unsaved,
    resultRef,
  };
}
