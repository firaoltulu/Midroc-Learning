import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import RadioButtonUncheckedOutlined from '@mui/icons-material/RadioButtonUncheckedOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import type { AuthoringView } from '../api/schemas';
import type { CourseSubmission } from '../hooks/use-course-submission';
import { READINESS_PROBLEMS, readinessProblems, type ReadinessProblem } from '../model/readiness';

/** Where each problem is fixed. */
const FIX_TAB: Record<ReadinessProblem, 'details' | 'content'> = {
  DESCRIPTION_REQUIRED: 'details',
  NO_MODULES: 'content',
  EMPTY_MODULE: 'content',
  EMPTY_EXAM: 'content',
};

/**
 * Review: the readiness checklist and the outcome of "Submit for review" (the button is in the
 * editor's top bar). The server has the last word: COURSE_INCOMPLETE lists its problems.
 */
export function ReviewTab({
  view,
  readOnly,
  submission,
  onGoToTab,
}: {
  view: AuthoringView;
  readOnly: boolean;
  /** Null when the course can't be submitted (in review, archived). */
  submission: CourseSubmission | null;
  onGoToTab: (tab: 'details' | 'content') => void;
}) {
  const { t } = useTranslation('editor');
  const errorMessage = useErrorMessage();
  const open = readinessProblems(view);
  const status = view.course.status;
  const serverProblems = submission?.serverProblems ?? null;

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Stack spacing={1}>
        <Typography variant="h3" component="h2">
          {t('review.checklistTitle')}
        </Typography>
        <Typography color="text.secondary">{t('review.checklistBody')}</Typography>
      </Stack>

      <Card
        component="ul"
        aria-label={t('review.checklistTitle')}
        sx={{ listStyle: 'none', m: 0, p: 0 }}
      >
        {READINESS_PROBLEMS.map((problem, index) => {
          const done = !open.includes(problem);
          return (
            <Stack
              key={problem}
              component="li"
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: 'center',
                p: 2,
                borderTop: index === 0 ? 0 : 1,
                borderColor: 'divider',
              }}
            >
              {done ? (
                <CheckCircleOutlined aria-hidden sx={{ color: 'success.main' }} />
              ) : (
                <RadioButtonUncheckedOutlined aria-hidden sx={{ color: 'text.secondary' }} />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography>{t(`review.check.${problem}`)}</Typography>
                <Typography variant="body2" color={done ? 'success.main' : 'text.secondary'}>
                  {done ? t('review.done') : t('review.toDo')}
                </Typography>
              </Box>
              {!done && !readOnly ? (
                <Button
                  size="small"
                  onClick={() => {
                    onGoToTab(FIX_TAB[problem]);
                  }}
                >
                  {FIX_TAB[problem] === 'details'
                    ? t('review.goToDetails')
                    : t('review.goToContent')}
                </Button>
              ) : null}
            </Stack>
          );
        })}
      </Card>

      <Box ref={submission?.resultRef} tabIndex={-1} sx={{ outline: 'none' }}>
        {serverProblems ? (
          <Alert severity="warning" variant="outlined" role="alert">
            <Typography sx={{ fontWeight: 600 }}>{t('review.incompleteTitle')}</Typography>
            <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5 }}>
              {serverProblems.map((problem) => (
                <li key={problem}>{t(`review.problem.${problem}`)}</li>
              ))}
            </Box>
          </Alert>
        ) : submission?.error ? (
          <Alert severity="error" variant="outlined" role="alert">
            {errorMessage(submission.error)}
          </Alert>
        ) : submission?.unsaved ? (
          <Alert severity="info" variant="outlined" role="alert">
            {t('review.unsaved')}
          </Alert>
        ) : null}
      </Box>

      {status === 'draft' || status === 'rejected' ? (
        <Typography variant="body2" color="text.secondary">
          {status === 'rejected' ? t('review.resubmitHint') : t('review.submitHint')}
        </Typography>
      ) : null}
    </Stack>
  );
}
