import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import CelebrationOutlined from '@mui/icons-material/CelebrationOutlined';
import ListAltOutlined from '@mui/icons-material/ListAltOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../shared/api/errors';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { ButtonLink, RouterLink } from '../../../shared/ui/router-links';
import { LoadingRegion, PageHeaderSkeleton } from '../../../shared/ui/skeletons';
import { useMe } from '../../auth';
import { courseDetailQueryOptions, type CourseDetail } from '../../courses';
import { PlayerOutline } from '../components/player-outline';
import { playerNavigation, type PlayerNavigation } from '../model/player-navigation';

// Heavy players load only when an item of their type opens.
const VideoItem = lazy(() => import('../components/video-item'));
const PdfItem = lazy(() => import('../components/pdf-item'));
const ExamItem = lazy(() => import('../components/exam/exam-item'));

/** /learn/$courseId/$itemId: the item, the course outline and previous/next. */
export function PlayerScreen({ courseId, itemId }: { courseId: string; itemId: string }) {
  const { t } = useTranslation('learning');
  const errorMessage = useErrorMessage();
  const me = useMe();
  const course = useQuery(courseDetailQueryOptions(courseId));

  if (course.isPending || me.isPending) return <PlayerSkeleton />;
  if (course.isError) {
    if (isApiError(course.error) && [400, 404].includes(course.error.status)) {
      return <NotInCourse courseId={null} />;
    }
    return (
      <ErrorState
        headingLevel="h1"
        description={errorMessage(course.error)}
        onRetry={() => void course.refetch()}
      />
    );
  }
  if (me.isError) return <ErrorState headingLevel="h1" onRetry={() => void me.refetch()} />;

  const nav = playerNavigation(course.data, itemId);
  if (!nav) return <NotInCourse courseId={courseId} />;

  const canView =
    course.data.enrolled || course.data.ownerId === me.data.id || me.data.role === 'admin';
  if (!canView) {
    return (
      <PageHeader
        title={t('player.notEnrolled.title')}
        description={t('player.notEnrolled.body')}
        actions={
          <ButtonLink variant="contained" to="/courses/$courseId" params={{ courseId }}>
            {t('player.notEnrolled.action')}
          </ButtonLink>
        }
      />
    );
  }

  return <Player course={course.data} nav={nav} />;
}

function Player({ course, nav }: { course: CourseDetail; nav: PlayerNavigation }) {
  const { t } = useTranslation(['learning', 'courses']);
  const contentLang = useContentLang(course.language);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { item } = nav;
  const completed = course.completedItemIds.includes(item.id);
  const percent = nav.total === 0 ? 0 : Math.round((nav.completed / nav.total) * 100);

  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 3, md: 4 },
        gridTemplateColumns: { xs: '1fr', md: '300px minmax(0, 1fr)' },
        alignItems: 'start',
      }}
    >
      {/* Desktop: the outline as a side panel. */}
      <Card
        component="aside"
        aria-label={t('learning:player.outline')}
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'sticky',
          top: 88,
          maxHeight: 'calc(100vh - 112px)',
          overflow: 'auto',
          p: 1,
        }}
      >
        <CourseProgress course={course} nav={nav} percent={percent} />
        <PlayerOutline course={course} currentItemId={item.id} />
      </Card>

      <Stack spacing={3} sx={{ minWidth: 0 }}>
        <Stack spacing={1}>
          <RouterLink
            to="/courses/$courseId"
            params={{ courseId: course.id }}
            variant="body2"
            sx={{ alignSelf: 'flex-start' }}
            {...contentLang}
          >
            {course.title}
          </RouterLink>
          <Box {...contentLang}>
            <PageHeader
              title={item.title}
              description={t('learning:player.position', {
                module: item.moduleTitle,
                position: nav.position,
                total: nav.total,
              })}
              meta={
                completed ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    color="success"
                    label={t('courses:outline.completed')}
                  />
                ) : null
              }
            />
          </Box>
        </Stack>

        {/* Mobile: content first; the outline opens from the bottom. */}
        <Button
          variant="outlined"
          startIcon={<ListAltOutlined />}
          onClick={() => {
            setDrawerOpen(true);
          }}
          sx={{ display: { md: 'none' }, alignSelf: 'flex-start', mt: -2 }}
          aria-haspopup="dialog"
        >
          {t('learning:player.openOutline', { completed: nav.completed, total: nav.total })}
        </Button>
        <Drawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
          }}
          slotProps={{
            paper: {
              'aria-label': t('learning:player.outline'),
              sx: { maxHeight: '80vh', borderTopLeftRadius: 14, borderTopRightRadius: 14, p: 1 },
            },
          }}
        >
          <CourseProgress course={course} nav={nav} percent={percent} />
          <PlayerOutline
            course={course}
            currentItemId={item.id}
            onNavigate={() => {
              setDrawerOpen(false);
            }}
          />
        </Drawer>

        {nav.courseCompleted ? <CourseCompleted courseId={course.id} /> : null}

        <Suspense
          fallback={
            <LoadingRegion>
              <Skeleton variant="rounded" sx={{ aspectRatio: '16 / 9', height: 'auto' }} />
            </LoadingRegion>
          }
        >
          {item.type === 'video' ? (
            <VideoItem courseId={course.id} itemId={item.id} title={item.title} />
          ) : item.type === 'pdf' ? (
            <PdfItem
              courseId={course.id}
              itemId={item.id}
              title={item.title}
              completed={completed}
            />
          ) : (
            <ExamItem courseId={course.id} examId={item.id} contentLang={contentLang} />
          )}
        </Suspense>

        <Stack
          component="nav"
          aria-label={t('learning:player.itemNavigation')}
          direction="row"
          spacing={2}
          sx={{ justifyContent: 'space-between', pt: 1 }}
        >
          {nav.previous ? (
            <ButtonLink
              variant="outlined"
              startIcon={<ArrowBackOutlined />}
              to="/learn/$courseId/$itemId"
              params={{ courseId: course.id, itemId: nav.previous.id }}
            >
              {t('learning:player.previous')}
            </ButtonLink>
          ) : (
            <span />
          )}
          {nav.next ? (
            <ButtonLink
              variant="contained"
              endIcon={<ArrowForwardOutlined />}
              to="/learn/$courseId/$itemId"
              params={{ courseId: course.id, itemId: nav.next.id }}
            >
              {t('learning:player.next')}
            </ButtonLink>
          ) : (
            <ButtonLink variant="outlined" to="/courses/$courseId" params={{ courseId: course.id }}>
              {t('learning:player.backToCourse')}
            </ButtonLink>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

function CourseProgress({
  course,
  nav,
  percent,
}: {
  course: CourseDetail;
  nav: PlayerNavigation;
  percent: number;
}) {
  const { t } = useTranslation('learning');
  return (
    <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
        {t('player.progress', { completed: nav.completed, total: nav.total })}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={nav.courseCompleted ? 'success' : 'primary'}
        aria-label={t('progress.label', { title: course.title })}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
}

function CourseCompleted({ courseId }: { courseId: string }) {
  const { t } = useTranslation('learning');
  return (
    <Stack
      role="status"
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{
        alignItems: { sm: 'center' },
        p: 2.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: '14px',
        bgcolor: 'surfaceMuted',
      }}
    >
      <CelebrationOutlined aria-hidden sx={{ color: 'success.main', fontSize: 32 }} />
      <Stack spacing={0.5} sx={{ flex: 1 }}>
        <Typography variant="h4" component="h2">
          {t('player.completed.title')}
        </Typography>
        <Typography color="text.secondary">{t('player.completed.body')}</Typography>
      </Stack>
      <ButtonLink variant="outlined" to="/courses/$courseId" params={{ courseId }}>
        {t('player.backToCourse')}
      </ButtonLink>
    </Stack>
  );
}

function NotInCourse({ courseId }: { courseId: string | null }) {
  const { t } = useTranslation('learning');
  return (
    <PageHeader
      title={t('player.notFound.title')}
      description={t('player.notFound.body')}
      actions={
        courseId ? (
          <ButtonLink variant="outlined" to="/courses/$courseId" params={{ courseId }}>
            {t('player.backToCourse')}
          </ButtonLink>
        ) : (
          <ButtonLink variant="outlined" to="/learn">
            {t('player.notFound.action')}
          </ButtonLink>
        )
      }
    />
  );
}

function PlayerSkeleton() {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 4,
        gridTemplateColumns: { xs: '1fr', md: '300px minmax(0, 1fr)' },
      }}
    >
      <LoadingRegion>
        <Skeleton variant="rounded" height={360} sx={{ display: { xs: 'none', md: 'block' } }} />
      </LoadingRegion>
      <Stack spacing={2}>
        <PageHeaderSkeleton />
        <LoadingRegion>
          <Skeleton variant="rounded" sx={{ aspectRatio: '16 / 9', height: 'auto' }} />
        </LoadingRegion>
      </Stack>
    </Box>
  );
}
