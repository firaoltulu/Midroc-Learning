import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../shared/api/errors';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { BrandLogo } from '../../../shared/ui/brand/brand-logo';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { ButtonLink, RouterLink } from '../../../shared/ui/router-links';
import { PageHeaderSkeleton, TextSkeleton } from '../../../shared/ui/skeletons';
import { StatusChip } from '../../../shared/ui/status-chip';
import { authoringQueryOptions } from '../api/authoring';
import type { AuthoringView } from '../api/schemas';
import { ContentTab, type Selection } from '../components/content-tab';
import { DetailsTab } from '../components/details-tab';
import { ReviewTab } from '../components/review-tab';
import { PublishedEditor } from '../components/published/published-editor';
import { WorkingContentTab } from '../components/published/working-content-tab';
import { WorkingReviewTab } from '../components/published/working-review-tab';
import { SaveIndicator } from '../components/save-indicator';
import { useCourseSubmission } from '../hooks/use-course-submission';
import { createSaveTracker, SaveTrackerContext } from '../model/save-tracker';
import { EDITOR_TABS, type EditorTab } from '../schemas/editor-search';

/**
 * /my-courses/$courseId/edit: the editor's own top bar (breadcrumb, status, save state and
 * Submit for review), then Details, Content and Review. Draft and rejected courses save as the
 * author goes; published courses are edited in a working copy and submitted for review
 * (PublishedEditor). In review or archived, the screens are read-only with a banner saying
 * why. The route uses the `focus` shell layout.
 */
export function EditorScreen({
  courseId,
  tab = 'details',
  onTabChange,
}: {
  courseId: string;
  tab?: EditorTab;
  onTabChange: (tab: EditorTab) => void;
}) {
  const { t } = useTranslation('editor');
  const errorMessage = useErrorMessage();
  const authoring = useQuery(authoringQueryOptions(courseId));
  const [tracker] = useState(createSaveTracker);

  // Warn before closing the tab while something isn't saved yet.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (tracker.hasUnsaved()) event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [tracker]);

  if (authoring.isPending) {
    return (
      <Frame>
        <PageHeaderSkeleton />
        <TextSkeleton lines={6} />
      </Frame>
    );
  }
  if (authoring.isError) {
    // An invalid id (400), someone else's course or a deleted one (404).
    if (isApiError(authoring.error) && [400, 403, 404].includes(authoring.error.status)) {
      return (
        <Frame>
          <PageHeader
            title={t('notFound.title')}
            description={t('notFound.body')}
            actions={
              <ButtonLink variant="outlined" to="/my-courses">
                {t('backToList')}
              </ButtonLink>
            }
          />
        </Frame>
      );
    }
    return (
      <Frame>
        <ErrorState
          headingLevel="h1"
          description={errorMessage(authoring.error)}
          onRetry={() => void authoring.refetch()}
        />
      </Frame>
    );
  }

  return (
    <SaveTrackerContext value={tracker}>
      <Workspace view={authoring.data} tab={tab} onTabChange={onTabChange} />
    </SaveTrackerContext>
  );
}

function Workspace({
  view,
  tab,
  onTabChange,
}: {
  view: AuthoringView;
  tab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
}) {
  const { t } = useTranslation('editor');
  const [selection, setSelection] = useState<Selection>(null);
  const courseId = view.course.id;
  const status = view.course.status;
  const published = status === 'published';
  const readOnly = status !== 'draft' && status !== 'rejected' && !published;
  const canSubmit = status === 'draft' || status === 'rejected';
  const submission = useCourseSubmission(courseId, () => {
    onTabChange('review');
  });

  const tabs = (
    <>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tab}
          onChange={(_event, next: EditorTab) => {
            onTabChange(next);
          }}
          aria-label={t('tabs.label')}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          {EDITOR_TABS.map((value) => (
            <Tab
              key={value}
              value={value}
              label={t(`tabs.${value}`)}
              id={`editor-tab-${value}`}
              aria-controls={`editor-panel-${value}`}
              sx={{ minHeight: 48 }}
            />
          ))}
        </Tabs>
      </Box>
      <Box
        role="tabpanel"
        id={`editor-panel-${tab}`}
        aria-labelledby={`editor-tab-${tab}`}
        sx={{ pt: 3 }}
      >
        {published ? (
          tab === 'details' ? (
            <DetailsTab view={view} readOnly={false} published />
          ) : tab === 'content' ? (
            <WorkingContentTab courseId={courseId} readOnly={false} />
          ) : (
            <WorkingReviewTab />
          )
        ) : tab === 'details' ? (
          <DetailsTab view={view} readOnly={readOnly} />
        ) : tab === 'content' ? (
          <ContentTab
            view={view}
            readOnly={readOnly}
            selection={selection}
            onSelect={setSelection}
          />
        ) : (
          <ReviewTab
            view={view}
            readOnly={readOnly}
            submission={canSubmit ? submission : null}
            onGoToTab={onTabChange}
          />
        )}
      </Box>
    </>
  );

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <EditorTopBar
        view={view}
        actions={
          <>
            <ButtonLink
              to="/courses/$courseId"
              params={{ courseId }}
              sx={{ display: { xs: 'none', lg: 'inline-flex' }, whiteSpace: 'nowrap' }}
            >
              {t('viewCourse')}
            </ButtonLink>
            {readOnly ? null : <SaveIndicator />}
            {canSubmit ? (
              <Button
                variant="contained"
                onClick={submission.submit}
                loading={submission.pending}
                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {t('review.submit')}
              </Button>
            ) : null}
          </>
        }
      />
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
        {published ? (
          <PublishedEditor view={view} renderTabs={() => tabs} onTabChange={onTabChange} />
        ) : (
          <Stack spacing={2}>
            <StatusBanner view={view} />
            <Box>{tabs}</Box>
          </Stack>
        )}
      </Container>
    </Box>
  );
}

/**
 * The editor's own bar (the app header is hidden here): the full logo, "My courses › title"
 * (the title is the page's h1) with the status, then the save state and the main action.
 */
function EditorTopBar({ view, actions }: { view: AuthoringView; actions: ReactNode }) {
  const { t } = useTranslation(['editor', 'common']);
  return (
    <Stack
      component="header"
      direction="row"
      spacing={{ xs: 1, sm: 2 }}
      useFlexGap
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        minHeight: 64,
        alignItems: 'center',
        // Phones: the save state and the main action wrap onto a second row.
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        rowGap: 1,
        px: { xs: 1.5, sm: 3 },
        py: 1,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <RouterLink
        to="/"
        aria-label={t('common:brand.homeLink')}
        sx={{ display: 'inline-flex', borderRadius: 1, flexShrink: 0, p: 0.5 }}
      >
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          <BrandLogo variant="mark" height={28} decorative />
        </Box>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <BrandLogo variant="full" height={34} decorative />
        </Box>
      </RouterLink>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flex: '1 1 200px', minWidth: 0, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <Box component="nav" aria-label={t('editor:topBar.breadcrumb')} sx={{ minWidth: 0 }}>
          <RouterLink
            to="/my-courses"
            underline="hover"
            sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
          >
            {t('editor:backToList')}
          </RouterLink>
          <Box component="span" aria-hidden sx={{ mx: 0.75, color: 'text.secondary' }}>
            ›
          </Box>
        </Box>
        <Typography
          component="h1"
          sx={{
            fontWeight: 700,
            fontSize: '1.0625rem',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: { xs: '100%', sm: 420 },
          }}
        >
          {view.course.title}
        </Typography>
        <StatusChip status={view.course.status} />
      </Stack>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: 'center',
          flexShrink: 0,
          width: { xs: '100%', md: 'auto' },
          justifyContent: { xs: 'space-between', md: 'flex-end' },
        }}
      >
        {actions}
      </Stack>
    </Stack>
  );
}

/** Loading and error states keep the editor's frame (no app header here). */
function Frame({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <Box
        component="header"
        sx={{
          height: 64,
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

/** Why the course can or can't be edited right now. */
function StatusBanner({ view }: { view: AuthoringView }) {
  const { t } = useTranslation('editor');
  const course = view.course;
  switch (course.status) {
    case 'draft':
      return null;
    case 'rejected':
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
    case 'pending_review':
      return (
        <Alert severity="info" variant="outlined">
          {t('banner.pendingReview')}
        </Alert>
      );
    case 'published':
      // The published editor shows its own banners.
      return null;
    case 'archived':
      return (
        <Alert severity="info" variant="outlined">
          {t('banner.archived')}
        </Alert>
      );
  }
}
