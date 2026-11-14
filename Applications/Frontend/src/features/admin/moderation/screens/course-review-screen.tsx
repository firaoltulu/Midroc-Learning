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
import { Fragment, useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../../shared/api/errors';
import { useContentLang } from '../../../../shared/i18n/content-lang';
import { useErrorMessage } from '../../../../shared/i18n/error-messages';
import { useNumberFormat } from '../../../../shared/i18n/format-number';
import { CourseThumbnail } from '../../../../shared/ui/course-thumbnail';
import { ErrorState } from '../../../../shared/ui/error-state';
import { PageHeader } from '../../../../shared/ui/page-header';
import { ButtonLink } from '../../../../shared/ui/router-links';
import { PageHeaderSkeleton, TextSkeleton } from '../../../../shared/ui/skeletons';
import { StatusChip } from '../../../../shared/ui/status-chip';
import { useToast } from '../../../../shared/ui/toast/toast-context';
import { courseReviewQueryOptions, useDecideCourse, type CourseReview } from '../api/moderation';
import { CourseTreePreview } from '../components/course-tree-preview';
import { DecisionActions } from '../components/decision-actions';
import { useDecisionLabels } from '../components/use-decision-labels';

/**
 * /admin/moderation/courses/$courseId: everything the owner submitted (exam answers
 * included), with Approve (publishes) and Reject (reason required).
 */
export function CourseReviewScreen({ courseId }: { courseId: string }) {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const review = useQuery(courseReviewQueryOptions(courseId));

  return (
    <Stack spacing={1}>
      <ButtonLink
        to="/admin/moderation"
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
              ? t('review.notFound')
              : undefined
          }
          description={errorMessage(review.error)}
          onRetry={() => void review.refetch()}
        />
      ) : (
        <CourseReviewContent courseId={courseId} review={review.data} />
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

function CourseReviewContent({ courseId, review }: { courseId: string; review: CourseReview }) {
  const { t } = useTranslation(['admin', 'common']);
  const errorMessage = useErrorMessage();
  const toast = useToast();
  const navigate = useNavigate();
  const decide = useDecideCourse(courseId);
  const labels = useDecisionLabels('course');
  const { formatNumber } = useNumberFormat();
  const { course, modules } = review;
  const contentLang = useContentLang(course.language);
  const pending = course.status === 'pending_review';

  const finish = (message: string) => {
    toast.show({ message, severity: 'success' });
    void navigate({ to: '/admin/moderation' });
  };
  /** A decision someone else already made: say so here instead of in the dialog. */
  const failed = (error: unknown) => {
    toast.show({ message: errorMessage(error), severity: 'error' });
  };

  const details: [string, ReactNode][] = [
    [t('review.fields.owner'), course.ownerName ?? t('review.noOwnerName')],
    [t('review.fields.language'), t(`common:languages.${course.language}`)],
    [t('review.fields.category'), course.category ?? t('review.none')],
    [
      t('review.fields.tags'),
      course.tags.length ? (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
          {course.tags.map((tag) => (
            <Chip key={tag} size="small" label={tag} variant="outlined" {...contentLang} />
          ))}
        </Stack>
      ) : (
        t('review.none')
      ),
    ],
    [
      t('review.fields.duration'),
      course.estimatedDurationMinutes === null
        ? t('review.none')
        : t('review.minutes', {
            count: course.estimatedDurationMinutes,
            minutes: formatNumber(course.estimatedDurationMinutes),
          }),
    ],
  ];

  return (
    <Stack spacing={4}>
      <PageHeader
        title={course.title}
        description={t('review.description')}
        meta={<StatusChip status={course.status} />}
        actions={
          pending ? (
            <DecisionActions
              labels={labels}
              onApprove={async () => {
                try {
                  await decide.mutateAsync({ kind: 'approve' });
                  finish(t('decision.course.approved'));
                } catch (error) {
                  failed(error);
                }
              }}
              onReject={async (reason) => {
                try {
                  await decide.mutateAsync({ kind: 'reject', reason });
                  finish(t('decision.course.rejected'));
                } catch (error) {
                  // Already decided elsewhere: close and say so; other problems stay in the dialog.
                  if (isApiError(error, 'LOCKED')) failed(error);
                  else throw error;
                }
              }}
            />
          ) : undefined
        }
      />
      {pending ? null : (
        <Alert severity="info" variant="outlined">
          {t('review.notPending')}
        </Alert>
      )}
      <Section title={t('review.details')}>
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <Box sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }}>
                <CourseThumbnail src={course.thumbnailUrl} />
              </Box>
              <Stack spacing={2} sx={{ minWidth: 0 }}>
                <Typography
                  {...contentLang}
                  sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxWidth: 720 }}
                >
                  {course.description || t('review.noDescription')}
                </Typography>
                <Box
                  component="dl"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'minmax(120px, auto) 1fr' },
                    columnGap: 3,
                    rowGap: 1,
                    m: 0,
                  }}
                >
                  {details.map(([label, value]) => (
                    <Fragment key={label}>
                      <Typography component="dt" color="text.secondary">
                        {label}
                      </Typography>
                      <Box component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>
                        {value}
                      </Box>
                    </Fragment>
                  ))}
                </Box>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Section>
      <Section title={t('review.content')}>
        <CourseTreePreview modules={modules} contentLang={contentLang} />
      </Section>
    </Stack>
  );
}
