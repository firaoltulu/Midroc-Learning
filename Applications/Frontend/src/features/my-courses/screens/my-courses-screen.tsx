import AddOutlined from '@mui/icons-material/AddOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
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
    <Stack spacing={3}>
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
        gridTemplateColumns: { xs: '1fr', sm: '200px minmax(0, 1fr)' },
        '&:hover': { borderColor: 'text.secondary' },
        '&:has(a:focus-visible)': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: '2px',
        },
      }}
    >
      <CourseThumbnail src={course.thumbnailUrl} />
      <Stack spacing={1} sx={{ p: 2, minWidth: 0, justifyContent: 'center' }}>
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
        <Typography variant="h4" component="h2" sx={{ overflowWrap: 'anywhere' }} {...contentLang}>
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
        <Typography variant="body2" color="text.secondary">
          {[
            t('courses:meta.modules', { count: course.moduleCount }),
            course.status === 'published' || course.status === 'archived'
              ? t('courses:meta.learners', { count: course.enrollmentCount })
              : null,
            t('updated', { date: formatDate(course.updatedAt) }),
          ]
            .filter(Boolean)
            .join(' · ')}
        </Typography>
        {course.status === 'rejected' && course.rejectionReason ? (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              overflowWrap: 'anywhere',
            }}
          >
            {t('rejectionReason', { reason: course.rejectionReason })}
          </Typography>
        ) : null}
      </Stack>
    </Card>
  );
}
