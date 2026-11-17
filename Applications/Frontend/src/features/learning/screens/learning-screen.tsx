import ArrowOutwardOutlined from '@mui/icons-material/ArrowOutwardOutlined';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
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
    <Stack spacing={3} sx={{ pb: 2 }}>
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
        gridTemplateColumns: { xs: '1fr', sm: '220px minmax(0, 1fr)' },
        overflow: 'hidden',
        borderColor: 'divider',
        borderRadius: '18px',
        bgcolor: 'background.paper',
        boxShadow: '0 4px 16px rgba(13, 36, 25, 0.045)',
        transition: (theme) =>
          theme.transitions.create(['border-color', 'box-shadow', 'transform'], {
            duration: theme.transitions.duration.short,
          }),
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 12px 30px rgba(13, 36, 25, 0.12)',
          transform: 'translateY(-3px)',
        },
        '&:hover [data-testid="course-thumbnail"] img': { transform: 'scale(1.04)' },
        '&:hover h2 a': { color: 'primary.main' },
        '&:has(a:focus-visible)': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: '2px',
        },
      }}
    >
      <Box
        sx={{
          minHeight: { sm: 168 },
          '& [data-testid="course-thumbnail"]': {
            height: '100%',
            minHeight: { sm: 168 },
            aspectRatio: { xs: '16 / 9', sm: 'auto' },
          },
        }}
      >
        <CourseThumbnail src={enrollment.thumbnailUrl} />
      </Box>
      <Stack spacing={1.5} sx={{ p: { xs: 1.75, sm: 2.5 }, minWidth: 0, justifyContent: 'center' }}>
        {enrollment.category ? (
          <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
            {enrollment.category}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography
            variant="h4"
            component="h2"
            sx={{ overflowWrap: 'anywhere', minWidth: 0, flex: 1 }}
            {...contentLang}
          >
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
          <ArrowOutwardOutlined
            aria-hidden
            sx={{ color: 'text.disabled', fontSize: 20, flexShrink: 0 }}
          />
        </Stack>
        <Chip
          size="small"
          icon={<CalendarTodayOutlined />}
          label={t('enrolledOn', { date: formatDate(enrollment.enrolledAt) })}
          sx={{
            alignSelf: 'flex-start',
            bgcolor: 'surfaceMuted',
            color: 'text.secondary',
            '& .MuiChip-icon': { color: 'text.secondary', fontSize: 16 },
          }}
        />
        <Box
          sx={{
            p: { xs: 1.5, sm: 1.75 },
            border: 1,
            borderColor: 'divider',
            borderRadius: '14px',
            bgcolor: 'surfaceMuted',
          }}
        >
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {done ? (
                <CheckCircleOutlined fontSize="small" sx={{ color: 'success.main' }} />
              ) : null}
              <Typography
                variant="body2"
                color={done ? 'success.main' : 'text.secondary'}
                sx={{ flex: 1, fontWeight: 600 }}
              >
                {done ? t('progress.completed') : t('progress.inProgress')}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              >
                {t('progress.percent', { percent: enrollment.progressPercent })}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={enrollment.progressPercent}
              color={done ? 'success' : 'primary'}
              aria-label={t('progress.label', { title: enrollment.title })}
              sx={{
                height: 8,
                borderRadius: 999,
                bgcolor: 'background.paper',
                '& .MuiLinearProgress-bar': { borderRadius: 999 },
              }}
            />
          </Stack>
        </Box>
      </Stack>
    </Card>
  );
}
