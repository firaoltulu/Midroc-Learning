import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { ButtonLink } from '../../../shared/ui/router-links';
import { useToast } from '../../../shared/ui/toast/toast-context';
import { useEnroll, useUnenroll } from '../api/course-detail';
import type { CourseDetail } from '../api/schemas';
import { canUnenroll, courseAction, courseProgress } from '../model/course-action';

/** Progress, the one primary action, and the quiet unenroll action. */
export function CourseActionPanel({
  course,
  viewerId,
}: {
  course: CourseDetail;
  viewerId: string;
}) {
  const { t } = useTranslation('courses');
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const enroll = useEnroll(course.id);
  const unenroll = useUnenroll(course.id);
  const [confirming, setConfirming] = useState(false);

  const action = courseAction(course, viewerId);
  const progress = courseProgress(course);
  const percent =
    progress.total === 0 ? 0 : Math.round((progress.completed / progress.total) * 100);
  const failure = enroll.error ?? unenroll.error;

  return (
    <Stack spacing={2}>
      {course.enrolled ? (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {action.kind === 'review'
              ? t('progress.completed')
              : t('progress.summary', { completed: progress.completed, total: progress.total })}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={percent}
            aria-label={t('progress.label')}
            aria-valuetext={t('progress.valueText', { percent })}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Stack>
      ) : null}

      {action.kind === 'enroll' ? (
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={enroll.isPending}
          onClick={() => {
            unenroll.reset();
            enroll.mutate(undefined, {
              onSuccess: () => {
                toast.show({ message: t('enroll.done'), severity: 'success' });
              },
            });
          }}
        >
          {enroll.isPending ? t('enroll.pending') : t('actions.enroll')}
        </Button>
      ) : null}
      {action.kind === 'continue' || action.kind === 'review' ? (
        <ButtonLink
          variant="contained"
          size="large"
          fullWidth
          to="/learn/$courseId/$itemId"
          params={{ courseId: course.id, itemId: action.itemId }}
        >
          {action.kind === 'continue' ? t('actions.continue') : t('actions.review')}
        </ButtonLink>
      ) : null}
      {action.kind === 'edit' ? (
        <ButtonLink
          variant="contained"
          size="large"
          fullWidth
          to="/my-courses/$courseId/edit"
          params={{ courseId: course.id }}
        >
          {t('actions.edit')}
        </ButtonLink>
      ) : null}

      {failure ? (
        <Alert severity="error" variant="outlined">
          {errorMessage(failure)}
        </Alert>
      ) : null}

      {canUnenroll(course, viewerId) ? (
        <Button
          variant="text"
          color="inherit"
          sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
          onClick={() => {
            setConfirming(true);
          }}
        >
          {t('actions.unenroll')}
        </Button>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title={t('unenroll.title')}
        description={t('unenroll.body')}
        confirmLabel={t('unenroll.confirm')}
        onClose={() => {
          setConfirming(false);
        }}
        onConfirm={async () => {
          enroll.reset();
          try {
            await unenroll.mutateAsync();
            toast.show({ message: t('unenroll.done'), severity: 'success' });
          } catch {
            // Shown inline above.
          } finally {
            setConfirming(false);
          }
        }}
      />
    </Stack>
  );
}
