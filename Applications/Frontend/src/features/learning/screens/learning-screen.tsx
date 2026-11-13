import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { useDateFormat } from '../../../shared/i18n/use-date-format';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { CourseThumbnail } from '../../../shared/ui/course-thumbnail';
import { EmptyState } from '../../../shared/ui/empty-state';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { ButtonLink, RouterLink } from '../../../shared/ui/router-links';
import { ListSkeleton } from '../../../shared/ui/skeletons';
import { enrollmentsQueryOptions, type Enrollment } from '../api/enrollments';

/** /learn: the courses I'm enrolled in, with progress. */
export function LearningScreen() {
  const { t } = useTranslation('learning');
  const errorMessage = useErrorMessage();
  const enrollments = useQuery(enrollmentsQueryOptions());

  return (
    <Stack spacing={3}>
      <PageHeader title={t('title')} description={t('description')} />
      {enrollments.isPending ? (
        <ListSkeleton rows={3} />
      ) : enrollments.isError ? (
        <ErrorState
          description={errorMessage(enrollments.error)}
          onRetry={() => void enrollments.refetch()}
        />
      ) : enrollments.data.length === 0 ? (
        <EmptyState
          icon={<SchoolOutlined />}
          title={t('empty.title')}
          description={t('empty.body')}
          action={
            <ButtonLink variant="outlined" to="/courses">
              {t('empty.action')}
            </ButtonLink>
          }
        />
      ) : (
        <Stack component="ul" spacing={2} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {enrollments.data.map((enrollment) => (
            <EnrollmentRow key={enrollment.id} enrollment={enrollment} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function EnrollmentRow({ enrollment }: { enrollment: Enrollment }) {
  const { t } = useTranslation('learning');
  const { formatDate } = useDateFormat();
  const contentLang = useContentLang(enrollment.language);
  const done = enrollment.progressPercent === 100;

  return (
    <Card
      component="li"
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '200px minmax(0, 1fr)' },
        '&:hover': { borderColor: 'text.secondary' },
        '&:has(a:focus-visible)': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: '2px',
        },
      }}
    >
      <CourseThumbnail src={enrollment.thumbnailUrl} />
      <Stack spacing={1.5} sx={{ p: 2, minWidth: 0, justifyContent: 'center' }}>
        <Typography variant="h4" component="h2" sx={{ overflowWrap: 'anywhere' }} {...contentLang}>
          <RouterLink
            to="/courses/$courseId"
            params={{ courseId: enrollment.id }}
            underline="none"
            color="inherit"
            sx={{
              '&::after': { content: '""', position: 'absolute', inset: 0 },
              '&:focus-visible': { outline: 'none' },
            }}
          >
            {enrollment.title}
          </RouterLink>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('enrolledOn', { date: formatDate(enrollment.enrolledAt) })}
        </Typography>
        <Box>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color={done ? 'success.main' : 'text.secondary'}>
              {done ? t('progress.completed') : t('progress.inProgress')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('progress.percent', { percent: enrollment.progressPercent })}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={enrollment.progressPercent}
            color={done ? 'success' : 'primary'}
            aria-label={t('progress.label', { title: enrollment.title })}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Stack>
    </Card>
  );
}
