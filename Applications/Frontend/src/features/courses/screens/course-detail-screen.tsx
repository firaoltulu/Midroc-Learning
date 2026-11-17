import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../shared/api/errors';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { ButtonLink } from '../../../shared/ui/router-links';
import { LoadingRegion, PageHeaderSkeleton, TextSkeleton } from '../../../shared/ui/skeletons';
import { useMe } from '../../auth';
import { courseDetailQueryOptions } from '../api/course-detail';
import type { CourseDetail } from '../api/schemas';
import { CourseHero } from '../components/course-hero';
import { CourseLearn } from '../components/course-learn';
import { CourseOutline } from '../components/course-outline';
import { CourseReviews } from '../components/course-reviews';
import { CourseStatusBanner } from '../components/course-status-banner';
import { restOfDescription } from '../lib/course-text';

/**
 * /courses/$courseId: the green hero (title, rating, the enroll card), then what the course
 * teaches, the description, the syllabus and learner reviews. A full-width page (the route
 * uses the `fullBleed` shell layout), so every state brings its own container.
 */
export function CourseDetailScreen({ courseId }: { courseId: string }) {
  const { t } = useTranslation('courses');
  const errorMessage = useErrorMessage();
  const me = useMe();
  const course = useQuery(courseDetailQueryOptions(courseId));

  if (course.isPending || me.isPending) return <CourseDetailSkeleton />;

  if (course.isError) {
    if (isApiError(course.error) && [400, 404].includes(course.error.status)) {
      return (
        <Padded>
          <PageHeader
            title={t('detail.notFound.title')}
            description={t('detail.notFound.body')}
            actions={
              <ButtonLink variant="outlined" to="/courses">
                {t('detail.notFound.action')}
              </ButtonLink>
            }
          />
        </Padded>
      );
    }
    return (
      <Padded>
        <ErrorState
          headingLevel="h1"
          description={errorMessage(course.error)}
          onRetry={() => void course.refetch()}
        />
      </Padded>
    );
  }
  if (me.isError) {
    return (
      <Padded>
        <ErrorState headingLevel="h1" onRetry={() => void me.refetch()} />
      </Padded>
    );
  }

  return (
    <CourseDetailView
      course={course.data}
      viewerId={me.data.id}
      isAdmin={me.data.role === 'admin'}
    />
  );
}

function Padded({ children }: { children: ReactNode }) {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
      <Box sx={{ width: '100%', maxWidth: 880, mx: 'auto' }}>{children}</Box>
    </Container>
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
  const isOwner = course.ownerId === viewerId;
  const canManage = isOwner || isAdmin;
  const canReview = course.enrolled && !isOwner && course.status === 'published';
  // The first paragraph is the hero's summary; the rest follows here.
  const about = restOfDescription(course.description);

  return (
    <>
      <CourseHero course={course} viewerId={viewerId} canManage={canManage} />
      <Container
        maxWidth="lg"
        sx={(theme) => ({
          py: { xs: 4, md: 5 },
          '& .MuiCard-root': {
            transition: theme.transitions.create(['border-color', 'box-shadow'], {
              duration: theme.transitions.duration.short,
            }),
            '@media (hover: hover)': {
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: '0 0 0 3px rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
              },
            },
          },
        })}
      >
        <Stack spacing={{ xs: 4, md: 5 }} sx={{ width: '100%', maxWidth: 960, mx: 'auto' }}>
          {canManage ? <CourseStatusBanner course={course} /> : null}
          <CourseLearn course={course} />
          <CourseOutline course={course} linkItems={course.enrolled || isOwner} />

          {about ? (
            <Stack component="section" spacing={1} aria-labelledby="course-about-heading">
              <Typography id="course-about-heading" variant="h3" component="h2">
                {t('detail.about')}
              </Typography>
              <Typography
                sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: '78ch' }}
                {...contentLang}
              >
                {about}
              </Typography>
            </Stack>
          ) : null}

          {course.status === 'published' ? (
            <CourseReviews course={course} canReview={canReview} canModerate={isAdmin} />
          ) : null}
        </Stack>
      </Container>
    </>
  );
}

function CourseDetailSkeleton() {
  return (
    <>
      <Box sx={{ bgcolor: 'hero.bg', py: { xs: 4, md: 7 } }}>
        <Container maxWidth="lg">
          <Box sx={{ height: { xs: 200, md: 220 } }} />
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
        <Stack spacing={3} sx={{ width: '100%', maxWidth: 960, mx: 'auto' }}>
          <PageHeaderSkeleton />
          <TextSkeleton lines={4} />
          <LoadingRegion>
            <Skeleton variant="rounded" height={160} />
          </LoadingRegion>
        </Stack>
      </Container>
    </>
  );
}
