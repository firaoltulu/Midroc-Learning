import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../shared/api/errors';
import { useErrorMessage } from '../../../shared/i18n/error-messages';
import { ErrorState } from '../../../shared/ui/error-state';
import { PageHeader } from '../../../shared/ui/page-header';
import { ButtonLink } from '../../../shared/ui/router-links';
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
import { createSaveTracker, SaveTrackerContext } from '../model/save-tracker';
import { EDITOR_TABS, type EditorTab } from '../schemas/editor-search';

/**
 * /my-courses/$courseId/edit: Details, Content and Review. Draft and rejected courses save as
 * the author goes; published courses are edited in a working copy and submitted for review
 * (PublishedEditor). In review or archived, the screens are read-only with a banner saying why.
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
  const [selection, setSelection] = useState<Selection>(null);

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
      <>
        <PageHeaderSkeleton />
        <TextSkeleton lines={6} />
      </>
    );
  }
  if (authoring.isError) {
    // An invalid id (400), someone else's course or a deleted one (404).
    if (isApiError(authoring.error) && [400, 403, 404].includes(authoring.error.status)) {
      return (
        <PageHeader
          title={t('notFound.title')}
          description={t('notFound.body')}
          actions={
            <ButtonLink variant="outlined" to="/my-courses">
              {t('backToList')}
            </ButtonLink>
          }
        />
      );
    }
    return (
      <ErrorState
        headingLevel="h1"
        description={errorMessage(authoring.error)}
        onRetry={() => void authoring.refetch()}
      />
    );
  }

  const view = authoring.data;
  const status = view.course.status;
  const published = status === 'published';
  const readOnly = status !== 'draft' && status !== 'rejected' && !published;

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
            />
          ))}
        </Tabs>
      </Box>
      <Box role="tabpanel" id={`editor-panel-${tab}`} aria-labelledby={`editor-tab-${tab}`}>
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
          <ReviewTab view={view} readOnly={readOnly} onGoToTab={onTabChange} />
        )}
      </Box>
    </>
  );

  return (
    <SaveTrackerContext value={tracker}>
      <Stack spacing={1}>
        <ButtonLink
          to="/my-courses"
          startIcon={<ArrowBackOutlined />}
          sx={{ alignSelf: 'flex-start', ml: -1 }}
        >
          {t('backToList')}
        </ButtonLink>
        <PageHeader
          title={view.course.title}
          meta={
            <>
              <StatusChip status={status} />
              {readOnly ? null : <SaveIndicator />}
            </>
          }
          actions={
            <ButtonLink variant="outlined" to="/courses/$courseId" params={{ courseId }}>
              {t('viewCourse')}
            </ButtonLink>
          }
        />
      </Stack>

      {published ? (
        <PublishedEditor view={view} renderTabs={() => tabs} onTabChange={onTabChange} />
      ) : (
        <Stack spacing={3}>
          <StatusBanner view={view} />
          {tabs}
        </Stack>
      )}
    </SaveTrackerContext>
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
