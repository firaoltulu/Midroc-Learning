import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { CourseDetail } from '../api/schemas';

/**
 * For the owner and administrators: why learners can't see the course (draft, in review,
 * rejected with the reason, archived), or that changes are waiting for review.
 */
export function CourseStatusBanner({ course }: { course: CourseDetail }) {
  const { t } = useTranslation('courses');

  if (course.status === 'published') {
    return course.pendingRevision ? (
      <Alert severity="info" variant="outlined">
        {t('banner.pendingRevision')}
      </Alert>
    ) : null;
  }
  if (course.status === 'rejected') {
    return (
      <Alert severity="warning" variant="outlined">
        {t('banner.rejected')}
        {course.rejectionReason ? (
          <Typography
            component="span"
            variant="body2"
            sx={{ display: 'block', mt: 1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
          >
            {t('banner.reason', { reason: course.rejectionReason })}
          </Typography>
        ) : null}
      </Alert>
    );
  }
  return (
    <Alert severity="info" variant="outlined">
      {t(`banner.${course.status}`)}
    </Alert>
  );
}
