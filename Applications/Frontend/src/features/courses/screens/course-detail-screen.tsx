import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../shared/api/errors';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { CourseThumbnail } from '../../../shared/ui/course-thumbnail';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { ButtonLink } from '../../../shared/ui/router-links';
import { LoadingRegion, PageHeaderSkeleton, TextSkeleton } from '../../../shared/ui/skeletons';
import { StatusChip } from '../../../shared/ui/status-chip';
import { useMe } from '../../auth';
import { courseDetailQueryOptions } from '../api/course-detail';
import type { CourseDetail } from '../api/schemas';
import { CourseActionPanel } from '../components/course-action-panel';
import { CourseMeta } from '../components/course-meta';
import { CourseOutline } from '../components/course-outline';
import { CourseStatusBanner } from '../components/course-status-banner';

/** /courses/$courseId: header, description, outline and the enroll/continue/edit action. */
export function CourseDetailScreen({ courseId }: { courseId: string }) {
  const { t } = useTranslation('courses');
  const errorMessage = useErrorMessage();
  const me = useMe();
  const course = useQuery(courseDetailQueryOptions(courseId));

  if (course.isPending || me.isPending) return <CourseDetailSkeleton />;

  if (course.isError) {
    if (isApiError(course.error) && [400, 404].includes(course.error.status)) {
      return (
        <PageHeader
          title={t('detail.notFound.title')}
          description={t('detail.notFound.body')}
          actions={
            <ButtonLink variant="outlined" to="/courses">
              {t('detail.notFound.action')}
            </ButtonLink>
          }
        />
      );
    }
    return (
      <ErrorState
        headingLevel="h1"
        description={errorMessage(course.error)}
        onRetry={() => void course.refetch()}
      />
    );
  }
  if (me.isError) {
    return <ErrorState headingLevel="h1" onRetry={() => void me.refetch()} />;
  }

  return (
    <CourseDetailView
      course={course.data}
      viewerId={me.data.id}
      isAdmin={me.data.role === 'admin'}
    />
  );
}

function CourseDetailView({
  course,
  viewerId,
  isAdmin,
}: {
  course: CourseDetail;
  viewerId: string;
  isAdmin: boolean;
}) {
  const { t } = useTranslation('courses');
  const contentLang = useContentLang(course.language);
  const canManage = course.ownerId === viewerId || isAdmin;
  const isOwner = course.ownerId === viewerId;

  return (
    <Stack spacing={4}>
      {canManage ? <CourseStatusBanner course={course} /> : null}

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 3, md: 5 },
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 340px' },
          alignItems: 'start',
        }}
      >
        {/* The aside comes first on small screens: image and the main action up top. */}
        <Card
          component="aside"
          aria-label={t('detail.actionsLabel')}
          sx={{ order: { xs: 0, md: 1 }, position: { md: 'sticky' }, top: { md: 88 } }}
        >
          <CourseThumbnail src={course.thumbnailUrl} />
          <CardContent>
            <CourseActionPanel course={course} viewerId={viewerId} />
          </CardContent>
        </Card>

        <Stack spacing={4} sx={{ order: { xs: 1, md: 0 }, minWidth: 0 }}>
          <Box>
            <Box {...contentLang}>
              <PageHeader
                title={course.title}
                meta={canManage ? <StatusChip status={course.status} /> : null}
              />
            </Box>
            <Stack spacing={1} sx={{ mt: -2 }}>
              {course.ownerName ? (
                <Typography color="text.secondary">
                  {t('detail.byOwner', { name: course.ownerName })}
                </Typography>
              ) : null}
              <CourseMeta course={course} />
              {course.status === 'published' ? (
                <Typography variant="body2" color="text.secondary">
                  {t('meta.learners', { count: course.enrollmentCount })}
                </Typography>
              ) : null}
            </Stack>
          </Box>

          {course.description ? (
            <Stack component="section" spacing={1} aria-labelledby="course-about-heading">
              <Typography id="course-about-heading" variant="h3" component="h2">
                {t('detail.about')}
              </Typography>
              <Typography
                sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: 720 }}
                {...contentLang}
              >
                {course.description}
              </Typography>
            </Stack>
          ) : null}

          <CourseOutline course={course} linkItems={course.enrolled || isOwner} />
        </Stack>
      </Box>
    </Stack>
  );
}

function CourseDetailSkeleton() {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 3, md: 5 },
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 340px' },
      }}
    >
      <Stack spacing={3} sx={{ order: { xs: 1, md: 0 } }}>
        <PageHeaderSkeleton />
        <TextSkeleton lines={4} />
      </Stack>
      <Box sx={{ order: { xs: 0, md: 1 } }}>
        <LoadingRegion>
          <Skeleton variant="rounded" sx={{ aspectRatio: '16 / 9', height: 'auto' }} />
          <Skeleton variant="rounded" height={44} sx={{ mt: 2 }} />
        </LoadingRegion>
      </Box>
    </Box>
  );
}
