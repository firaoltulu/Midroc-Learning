import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import CelebrationOutlined from '@mui/icons-material/CelebrationOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../shared/api/errors';
import { useContentLang } from '../../../shared/i18n/content-lang';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { BrandLogo } from '../../../shared/ui/brand/brand-logo';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { ButtonLink, RouterLink } from '../../../shared/ui/router-links';
import { LoadingRegion, PageHeaderSkeleton } from '../../../shared/ui/skeletons';
import { useMe } from '../../auth';
import { courseDetailQueryOptions, type CourseDetail } from '../../courses';
import { useSaveProgress } from '../api/playback';
import { ItemTabs } from '../components/item-tabs';
import { PlayerOutline } from '../components/player-outline';
import { PlayerTopBar } from '../components/player-top-bar';
import { PLAYER_BAR_HEIGHT } from '../model/player-layout';
import { playerNavigation, type PlayerNavigation } from '../model/player-navigation';

// Heavy players load only when an item of their type opens.
const VideoItem = lazy(() => import('../components/video-item'));
const PdfItem = lazy(() => import('../components/pdf-item'));
const ExamItem = lazy(() => import('../components/exam/exam-item'));

/**
 * /learn/$courseId/$itemId: the player's own top bar, the outline as a side panel (a bottom
 * drawer on small screens), the item, its title with Mark as complete and Next, and the
 * Overview / Discussions / Notes tabs. The route uses the `focus` shell layout.
 */
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
      <PlainFrame>
        <ErrorState
          headingLevel="h1"
          description={errorMessage(course.error)}
          onRetry={() => void course.refetch()}
        />
      </PlainFrame>
    );
  }
  if (me.isError) {
    return (
      <PlainFrame>
        <ErrorState headingLevel="h1" onRetry={() => void me.refetch()} />
      </PlainFrame>
    );
  }

  const nav = playerNavigation(course.data, itemId);
  if (!nav) return <NotInCourse courseId={courseId} />;

  const isOwner = course.data.ownerId === me.data.id;
  const isAdmin = me.data.role === 'admin';
  if (!course.data.enrolled && !isOwner && !isAdmin) {
    return (
      <PlainFrame>
        <PageHeader
          title={t('player.notEnrolled.title')}
          description={t('player.notEnrolled.body')}
          actions={
            <ButtonLink variant="contained" to="/courses/$courseId" params={{ courseId }}>
              {t('player.notEnrolled.action')}
            </ButtonLink>
          }
        />
      </PlainFrame>
    );
  }

  return <Player course={course.data} nav={nav} canModerate={isOwner || isAdmin} />;
}

function Player({
  course,
  nav,
  canModerate,
}: {
  course: CourseDetail;
  nav: PlayerNavigation;
  canModerate: boolean;
}) {
  const { t } = useTranslation(['learning', 'courses']);
  const contentLang = useContentLang(course.language);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { item } = nav;
  const completed = course.completedItemIds.includes(item.id);
  const percent = nav.total === 0 ? 0 : Math.round((nav.completed / nav.total) * 100);
  const saveProgress = useSaveProgress(course.id, item.id);

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <PlayerTopBar
        course={course}
        percent={percent}
        onOpenOutline={() => {
          setDrawerOpen(true);
        }}
      />

      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '320px minmax(0, 1fr)' },
        }}
      >
        {/* Desktop: the outline as a full-height side panel. */}
        <Box
          component="aside"
          aria-label={t('learning:player.outline')}
          sx={(theme) => ({
            display: { xs: 'none', md: 'block' },
            position: 'sticky',
            top: PLAYER_BAR_HEIGHT,
            zIndex: 1,
            alignSelf: 'start',
            height: `calc(100dvh - ${String(PLAYER_BAR_HEIGHT)}px)`,
            overflow: 'auto',
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.82)',
            backgroundImage:
              'linear-gradient(155deg, rgba(var(--mui-palette-primary-mainChannel) / 0.055), transparent 42%)',
            backdropFilter: 'blur(18px) saturate(145%)',
            WebkitBackdropFilter: 'blur(18px) saturate(145%)',
            boxShadow: '4px 0 20px rgba(var(--mui-palette-primary-mainChannel) / 0.08)',
            transition: theme.transitions.create('box-shadow', {
              duration: theme.transitions.duration.short,
            }),
            '@media (hover: hover)': {
              '&:hover': {
                boxShadow: '8px 0 28px rgba(var(--mui-palette-primary-mainChannel) / 0.16)',
              },
            },
            p: 1.5,
          })}
        >
          <PlayerOutline course={course} currentItemId={item.id} />
        </Box>

        {/* Mobile: content first; the outline opens from the bottom (button in the top bar). */}
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
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, pt: 1.5 }}>
            {t('learning:player.progress', { completed: nav.completed, total: nav.total })}
          </Typography>
          <PlayerOutline
            course={course}
            currentItemId={item.id}
            onNavigate={() => {
              setDrawerOpen(false);
            }}
          />
        </Drawer>

        <Box sx={{ minWidth: 0, px: { xs: 2, sm: 4 }, py: { xs: 2, sm: 3 } }}>
          <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto' }}>
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
                <ExamItem
                  courseId={course.id}
                  examId={item.id}
                  title={item.title}
                  contentLang={contentLang}
                />
              )}
            </Suspense>

            {/* The title row: the item's name, then Mark as complete and Next. */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                useFlexGap
                sx={{ alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}
              >
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' }, overflowWrap: 'anywhere' }}
                  {...contentLang}
                >
                  {item.title}
                </Typography>
                {completed ? (
                  <Chip
                    size="small"
                    variant="outlined"
                    color="success"
                    label={t('courses:outline.completed')}
                  />
                ) : null}
              </Stack>
              <Stack
                component="nav"
                aria-label={t('learning:player.itemNavigation')}
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: 'wrap', flexShrink: 0 }}
              >
                {nav.previous ? (
                  <ButtonLink
                    color="inherit"
                    startIcon={<ArrowBackOutlined />}
                    to="/learn/$courseId/$itemId"
                    params={{ courseId: course.id, itemId: nav.previous.id }}
                    sx={{ color: 'text.secondary' }}
                  >
                    {t('learning:player.previous')}
                  </ButtonLink>
                ) : null}
                {/* Exams complete by passing an attempt, not by hand. */}
                {item.type !== 'exam' && !completed ? (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      saveProgress({ completed: true });
                    }}
                  >
                    {t('learning:player.markComplete')}
                  </Button>
                ) : null}
                {nav.next ? (
                  <ButtonLink
                    variant="contained"
                    endIcon={<ArrowForwardOutlined />}
                    to="/learn/$courseId/$itemId"
                    params={{ courseId: course.id, itemId: nav.next.id }}
                  >
                    {t('learning:player.next')}
                  </ButtonLink>
                ) : null}
              </Stack>
            </Stack>

            <ItemTabs course={course} nav={nav} canModerate={canModerate} />
          </Stack>
        </Box>
      </Box>
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

/** States without a course to show (loading, not found, not enrolled): the mark and the message. */
function PlainFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <Box
        component="header"
        sx={{
          height: PLAYER_BAR_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          px: { xs: 1, sm: 3 },
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <RouterLink
          to="/"
          aria-label={t('brand.homeLink')}
          sx={{ display: 'inline-flex', borderRadius: 1, p: 0.5 }}
        >
          <BrandLogo variant="mark" height={28} decorative />
        </RouterLink>
      </Box>
      <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
        {children}
      </Container>
    </Box>
  );
}

function NotInCourse({ courseId }: { courseId: string | null }) {
  const { t } = useTranslation('learning');
  return (
    <PlainFrame>
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
    </PlainFrame>
  );
}

function PlayerSkeleton() {
  return (
    <PlainFrame>
      <Stack spacing={2} sx={{ maxWidth: 960, mx: 'auto' }}>
        <LoadingRegion>
          <Skeleton variant="rounded" sx={{ aspectRatio: '16 / 9', height: 'auto' }} />
        </LoadingRegion>
        <PageHeaderSkeleton />
      </Stack>
    </PlainFrame>
  );
}
