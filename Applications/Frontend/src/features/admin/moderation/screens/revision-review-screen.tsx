import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../../shared/api/errors';
import { useContentLang } from '../../../../shared/i18n/content-lang';
import { useErrorMessage } from '../../../../shared/i18n/error-messages';
import { useDateFormat } from '../../../../shared/i18n/use-date-format';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog';
import { ErrorState } from '../../../../shared/ui/error-state';
import { FormTextField } from '../../../../shared/ui/form-text-field';
import { PageHeader } from '../../../../shared/ui/page-header';
import { RouterLink } from '../../../../shared/ui/router-links';
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
import { useDecisionLabels } from '../components/use-decision-labels';
import { REASON_MAX, rejectionSchema } from '../schemas/rejection';

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
      <Box component="nav" aria-label={t('revision.breadcrumb')}>
        <Typography variant="body2" color="text.secondary">
          <RouterLink
            to="/admin/moderation"
            search={{ tab: 'revisions' }}
            underline="hover"
            sx={{ color: 'inherit' }}
          >
            {t('nav.moderation')}
          </RouterLink>
          <Box component="span" aria-hidden sx={{ mx: 0.75 }}>
            ›
          </Box>
          {t('revision.crumb')}
        </Typography>
      </Box>
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

/** A card with a bold title (and an optional count) above its content. */
function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <Card component="section" aria-labelledby={headingId}>
      <Box sx={{ px: 2.5, py: 1.75, borderBottom: 1, borderColor: 'divider' }}>
        <Typography id={headingId} component="h2" sx={{ fontWeight: 700 }}>
          {title}
          {count !== undefined ? (
            <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
              {count}
            </Typography>
          ) : null}
        </Typography>
      </Box>
      {children}
    </Card>
  );
}

/** Problems a decision can run into that change what the page offers. */
type Blocker = 'stale' | 'decided' | null;

function RevisionContent({ review }: { review: RevisionReview }) {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const toast = useToast();
  const navigate = useNavigate();
  const { formatRelative, formatDateTime } = useDateFormat();
  const labels = useDecisionLabels('revision');
  const decide = useDecideRevision(review.id, review.courseId);
  const [blocker, setBlocker] = useState<Blocker>(null);
  const [approving, setApproving] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const reasonRef = useRef<HTMLInputElement>(null);
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

  /** Reject with the reason typed below (required: the owner reads it and fixes what it says). */
  const reject = async () => {
    const parsed = rejectionSchema.safeParse({ reason });
    if (!parsed.success) {
      setReasonError(parsed.error.issues[0]?.message ?? 'admin:reject.errors.required');
      reasonRef.current?.focus();
      return;
    }
    setReasonError(null);
    setRejecting(true);
    try {
      await decide.mutateAsync({ kind: 'reject', reason: parsed.data.reason });
      finish(t('decision.revision.rejected'));
    } catch (error) {
      handle(error);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title={courseTitle}
        description={t('revision.submittedAgo', { when: formatRelative(review.submittedAt) })}
        meta={
          review.status === 'pending' ? undefined : (
            <Chip size="small" variant="outlined" label={t(`revision.status.${review.status}`)} />
          )
        }
        actions={
          pending ? (
            <Stack direction="row" spacing={1.5}>
              <Button variant="outlined" onClick={() => void reject()} loading={rejecting}>
                {labels.reject}
              </Button>
              {blocker === 'stale' ? null : (
                <Button
                  variant="contained"
                  onClick={() => {
                    setApproving(true);
                  }}
                >
                  {labels.approve}
                </Button>
              )}
            </Stack>
          ) : undefined
        }
      />
      <Typography variant="body2" color="text.secondary" sx={{ mt: -2 }}>
        {formatDateTime(review.submittedAt)}
      </Typography>
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
        <CardContent>
          <CourseFieldDiff before={before} after={after} contentLang={contentLang} />
        </CardContent>
      </Section>
      <Section title={t('revision.changesTitle')} count={review.changes.length}>
        <ChangeList changes={review.changes} />
      </Section>
      {pending ? (
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <FormTextField
              ref={reasonRef}
              label={t('revision.reasonLabel')}
              placeholder={t('revision.reasonPlaceholder')}
              labelPlacement="above"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError(null);
              }}
              multiline
              minRows={3}
              errorKey={reasonError ?? undefined}
              hint={t('reject.reasonHint', { length: reason.length, max: REASON_MAX })}
            />
          </CardContent>
        </Card>
      ) : null}
      <Section title={t('revision.treeTitle')}>
        <CardContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('revision.treeHint')}
          </Typography>
          <CourseTreePreview
            modules={review.diff.modules.after}
            contentLang={contentLang}
            liveIds={liveIds}
          />
        </CardContent>
      </Section>
      <ConfirmDialog
        open={approving}
        title={labels.approveTitle}
        description={labels.approveBody}
        confirmLabel={labels.approve}
        onClose={() => {
          setApproving(false);
        }}
        onConfirm={async () => {
          try {
            await decide.mutateAsync({ kind: 'approve' });
            finish(t('decision.revision.approved'));
          } catch (error) {
            handle(error);
          } finally {
            setApproving(false);
          }
        }}
      />
    </Stack>
  );
}
