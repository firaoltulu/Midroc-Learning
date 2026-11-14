import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../../shared/api/errors';
import { useContentLang } from '../../../../shared/i18n/content-lang';
import { useErrorMessage } from '../../../../shared/i18n/error-messages';
import { useDateFormat } from '../../../../shared/i18n/use-date-format';
import { ErrorState } from '../../../../shared/ui/error-state';
import { PageHeader } from '../../../../shared/ui/page-header';
import { ButtonLink, RouterLink } from '../../../../shared/ui/router-links';
import { PageHeaderSkeleton, TextSkeleton } from '../../../../shared/ui/skeletons';
import { useToast } from '../../../../shared/ui/toast/toast-context';
import {
  revisionReviewQueryOptions,
  useDecideRevision,
  type RevisionReview,
} from '../api/moderation';
import { ChangeList } from '../components/change-list';
import { CourseFieldDiff } from '../components/course-field-diff';
import { CourseTreePreview } from '../components/course-tree-preview';
import { DecisionActions } from '../components/decision-actions';
import { useDecisionLabels } from '../components/use-decision-labels';

/**
 * /admin/moderation/revisions/$revisionId: a published course's proposed changes (course
 * fields from → to, the content change list, the proposed tree), with Approve and Reject.
 */
export function RevisionReviewScreen({ revisionId }: { revisionId: string }) {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const review = useQuery(revisionReviewQueryOptions(revisionId));

  return (
    <Stack spacing={1}>
      <ButtonLink
        to="/admin/moderation"
        search={{ tab: 'revisions' }}
        startIcon={<ArrowBackOutlined />}
        sx={{ alignSelf: 'flex-start', ml: -1 }}
      >
        {t('moderation.back')}
      </ButtonLink>
      {review.isPending ? (
        <Stack spacing={3}>
          <PageHeaderSkeleton />
          <TextSkeleton lines={8} />
        </Stack>
      ) : review.isError ? (
        <ErrorState
          headingLevel="h1"
          title={
            isApiError(review.error) && review.error.status === 404
              ? t('revision.notFound')
              : undefined
          }
          description={errorMessage(review.error)}
          onRetry={() => void review.refetch()}
        />
      ) : (
        <RevisionContent review={review.data} />
      )}
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <Box component="section" aria-labelledby={headingId}>
      <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/** Problems a decision can run into that change what the page offers. */
type Blocker = 'stale' | 'decided' | null;

function RevisionContent({ review }: { review: RevisionReview }) {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const toast = useToast();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const labels = useDecisionLabels('revision');
  const decide = useDecideRevision(review.id, review.courseId);
  const [blocker, setBlocker] = useState<Blocker>(null);
  const { before, after } = review.diff.course;
  const language = typeof after.language === 'string' ? after.language : 'en';
  const contentLang = useContentLang(language);
  const courseTitle = typeof before.title === 'string' ? before.title : '';
  const pending = review.status === 'pending' && blocker !== 'decided';

  // Ids on the live course: anything else in the proposed tree is new.
  const liveIds = useMemo(() => {
    const ids = new Set<string>();
    for (const module of review.diff.modules.before) {
      if (module.id) ids.add(module.id);
      for (const item of module.items) if (item.id) ids.add(item.id);
    }
    return ids;
  }, [review.diff.modules.before]);

  const finish = (message: string) => {
    toast.show({ message, severity: 'success' });
    void navigate({ to: '/admin/moderation', search: { tab: 'revisions' } });
  };
  /** STALE_REVISION and ALREADY_DECIDED change the page; anything else is a toast. */
  const handle = (error: unknown) => {
    if (isApiError(error, 'STALE_REVISION')) setBlocker('stale');
    else if (isApiError(error, 'ALREADY_DECIDED')) setBlocker('decided');
    else toast.show({ message: errorMessage(error), severity: 'error' });
  };

  return (
    <Stack spacing={4}>
      <PageHeader
        title={t('revision.title', { title: courseTitle })}
        description={t('revision.submitted', { date: formatDateTime(review.submittedAt) })}
        meta={
          <Chip size="small" variant="outlined" label={t(`revision.status.${review.status}`)} />
        }
        actions={
          pending ? (
            <DecisionActions
              labels={labels}
              canApprove={blocker !== 'stale'}
              onApprove={async () => {
                try {
                  await decide.mutateAsync({ kind: 'approve' });
                  finish(t('decision.revision.approved'));
                } catch (error) {
                  handle(error);
                }
              }}
              onReject={async (reason) => {
                try {
                  await decide.mutateAsync({ kind: 'reject', reason });
                  finish(t('decision.revision.rejected'));
                } catch (error) {
                  if (isApiError(error, 'ALREADY_DECIDED')) handle(error);
                  else throw error;
                }
              }}
            />
          ) : undefined
        }
      />
      {blocker === 'stale' ? (
        <Alert severity="warning" variant="outlined" role="alert">
          {t('revision.stale')}
        </Alert>
      ) : null}
      {blocker === 'decided' ? (
        <Alert severity="info" variant="outlined" role="alert">
          {t('revision.alreadyDecided')}{' '}
          <RouterLink to="/admin/moderation" search={{ tab: 'revisions' }}>
            {t('moderation.back')}
          </RouterLink>
        </Alert>
      ) : null}
      {review.status !== 'pending' ? (
        <Alert severity="info" variant="outlined">
          {t(`revision.decided.${review.status === 'approved' ? 'approved' : 'rejected'}`)}
          {review.rejectionReason ? (
            <Box
              component="span"
              sx={{ display: 'block', mt: 1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
            >
              {t('revision.reason', { reason: review.rejectionReason })}
            </Box>
          ) : null}
        </Alert>
      ) : null}
      <Section title={t('revision.courseChangesTitle')}>
        <Card>
          <CardContent>
            <CourseFieldDiff before={before} after={after} contentLang={contentLang} />
          </CardContent>
        </Card>
      </Section>
      <Section title={t('revision.changesTitle')}>
        <ChangeList changes={review.changes} />
      </Section>
      <Section title={t('revision.treeTitle')}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t('revision.treeHint')}
        </Typography>
        <CourseTreePreview
          modules={review.diff.modules.after}
          contentLang={contentLang}
          liveIds={liveIds}
        />
      </Section>
    </Stack>
  );
}
