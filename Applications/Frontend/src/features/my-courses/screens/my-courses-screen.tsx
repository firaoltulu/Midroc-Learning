import AddOutlined from '@mui/icons-material/AddOutlined';
import ArrowOutwardOutlined from '@mui/icons-material/ArrowOutwardOutlined';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import PeopleOutlineOutlined from '@mui/icons-material/PeopleOutlineOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { useDateFormat } from '../../../shared/i18n/use-date-format';
import { CourseThumbnail } from '../../../shared/ui/course-thumbnail';
import { EmptyState } from '../../../shared/ui/empty-state';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { ButtonLink, RouterLink } from '../../../shared/ui/router-links';
import { ListSkeleton } from '../../../shared/ui/skeletons';
import { StatusChip } from '../../../shared/ui/status-chip';
import { myCoursesQueryOptions, type OwnedCourse } from '../api/my-courses';

/** /my-courses: the courses I own, newest change first, each opening the editor. */
export function MyCoursesScreen() {
  const { t } = useTranslation('myCourses');
  const errorMessage = useErrorMessage();
  const courses = useQuery(myCoursesQueryOptions());

  const create = (
    <ButtonLink variant="contained" to="/my-courses/new" startIcon={<AddOutlined />}>
      {t('create')}
    </ButtonLink>
  );

  return (
    <Stack spacing={3} sx={{ pb: 2 }}>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={courses.data?.length ? create : undefined}
      />
      {courses.isPending ? (
        <ListSkeleton rows={3} />
      ) : courses.isError ? (
        <ErrorState
          description={errorMessage(courses.error)}
          onRetry={() => void courses.refetch()}
        />
      ) : courses.data.length === 0 ? (
        <EmptyState
          icon={<EditNoteOutlined />}
          title={t('empty.title')}
          description={t('empty.body')}
          action={create}
        />
      ) : (
        <Stack component="ul" spacing={2} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {courses.data.map((course) => (
            <OwnedCourseRow key={course.id} course={course} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function OwnedCourseRow({ course }: { course: OwnedCourse }) {
  const { t } = useTranslation(['myCourses', 'courses']);
  const { formatDate } = useDateFormat();
  const contentLang = useContentLang(course.language);

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
        <CourseThumbnail src={course.thumbnailUrl} />
      </Box>
      <Stack
        spacing={1.25}
        sx={{ p: { xs: 1.75, sm: 2.5 }, minWidth: 0, justifyContent: 'center' }}
      >
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: 'wrap', alignItems: 'center' }}
        >
          <StatusChip status={course.status} />
          {course.pendingRevision ? (
            <Chip
              size="small"
              variant="outlined"
              label={t('pendingRevision')}
              sx={{ maxWidth: '100%' }}
            />
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography
            variant="h4"
            component="h2"
            sx={{ overflowWrap: 'anywhere', minWidth: 0, flex: 1 }}
            {...contentLang}
          >
            <RouterLink
              to="/my-courses/$courseId/edit"
              params={{ courseId: course.id }}
              underline="none"
              color="inherit"
              sx={{
                '&::after': { content: '""', position: 'absolute', inset: 0 },
                '&:focus-visible': { outline: 'none' },
              }}
            >
              {course.title}
            </RouterLink>
          </Typography>
          <ArrowOutwardOutlined
            aria-hidden
            sx={{ color: 'text.disabled', fontSize: 20, flexShrink: 0 }}
          />
        </Stack>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Chip
            size="small"
            icon={<MenuBookOutlined />}
            label={t('courses:meta.modules', { count: course.moduleCount })}
            sx={{
              bgcolor: 'surfaceMuted',
              border: 1,
              borderColor: 'divider',
              '& .MuiChip-icon': { color: 'text.secondary', fontSize: 17 },
            }}
          />
          {course.status === 'published' || course.status === 'archived' ? (
            <Chip
              size="small"
              icon={<PeopleOutlineOutlined />}
              label={t('courses:meta.learners', { count: course.enrollmentCount })}
              sx={{
                bgcolor: 'surfaceMuted',
                border: 1,
                borderColor: 'divider',
                '& .MuiChip-icon': { color: 'text.secondary', fontSize: 17 },
              }}
            />
          ) : null}
          <Chip
            size="small"
            icon={<CalendarTodayOutlined />}
            label={t('updated', { date: formatDate(course.updatedAt) })}
            sx={{
              bgcolor: 'transparent',
              color: 'text.secondary',
              '& .MuiChip-icon': { color: 'text.secondary', fontSize: 16 },
            }}
          />
        </Stack>
        {course.status === 'rejected' && course.rejectionReason ? (
          <Box
            sx={{
              px: 1.5,
              py: 1,
              border: 1,
              borderColor: 'status.rejected.bg',
              borderRadius: '10px',
              bgcolor: 'status.rejected.bg',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'status.rejected.fg',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                overflowWrap: 'anywhere',
              }}
            >
              {t('rejectionReason', { reason: course.rejectionReason })}
            </Typography>
          </Box>
        ) : null}
      </Stack>
    </Card>
  );
}
