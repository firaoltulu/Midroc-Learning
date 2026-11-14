import GroupOutlined from '@mui/icons-material/GroupOutlined';
import PersonRemoveOutlined from '@mui/icons-material/PersonRemoveOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../../shared/api/errors';
import { useErrorMessage } from '../../../../shared/i18n/error-messages';
import { useNumberFormat } from '../../../../shared/i18n/format-number';
import { useDateFormat } from '../../../../shared/i18n/use-date-format';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog';
import { DataTable } from '../../../../shared/ui/data-table';
import { EmptyState } from '../../../../shared/ui/empty-state';
import { ErrorState } from '../../../../shared/ui/error-state';
import { PageHeader } from '../../../../shared/ui/page-header';
import { ButtonLink } from '../../../../shared/ui/router-links';
import { SearchField } from '../../../../shared/ui/search-field';
import { PageHeaderSkeleton, TextSkeleton } from '../../../../shared/ui/skeletons';
import { StatusChip } from '../../../../shared/ui/status-chip';
import { useToast } from '../../../../shared/ui/toast/toast-context';
import { ITEM_ICONS } from '../../../courses';
import {
  ADMIN_PAGE_SIZE,
  courseAnalyticsQueryOptions,
  courseEnrollmentsQueryOptions,
  useRemoveEnrollment,
  type CourseAnalytics,
  type CourseEnrollment,
  type EnrollmentFilters,
} from '../api/admin-courses';

const ProgressChart = lazy(() => import('../components/progress-chart'));

export interface AdminCourseScreenProps {
  courseId: string;
  search: EnrollmentFilters;
  onSearchChange: (next: EnrollmentFilters, options?: { replace?: boolean }) => void;
}

/** /admin/courses/$courseId: a course's analytics and its enrollments (with remove). */
export function AdminCourseScreen({ courseId, search, onSearchChange }: AdminCourseScreenProps) {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const analytics = useQuery(courseAnalyticsQueryOptions(courseId));

  if (analytics.isPending) {
    return (
      <Stack spacing={3}>
        <PageHeaderSkeleton />
        <TextSkeleton lines={6} />
      </Stack>
    );
  }
  if (analytics.isError) {
    return (
      <ErrorState
        headingLevel="h1"
        title={
          isApiError(analytics.error) && analytics.error.status === 404
            ? t('course.notFound')
            : undefined
        }
        description={errorMessage(analytics.error)}
        onRetry={() => void analytics.refetch()}
      />
    );
  }

  const course = analytics.data;
  return (
    <Stack spacing={4}>
      <PageHeader
        title={course.title}
        description={t('course.description')}
        meta={<StatusChip status={course.status} />}
        actions={
          <ButtonLink variant="outlined" to="/courses/$courseId" params={{ courseId }}>
            {t('course.openCourse')}
          </ButtonLink>
        }
      />
      <Summary course={course} />
      <Progress course={course} />
      <Items course={course} />
      <Enrollments courseId={courseId} search={search} onSearchChange={onSearchChange} />
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

function Summary({ course }: { course: CourseAnalytics }) {
  const { t } = useTranslation('admin');
  const { formatNumber, formatPercent } = useNumberFormat();
  const percent = (value: number | null) =>
    value === null ? t('dashboard.none') : formatPercent(value);
  const figures = [
    [t('course.figures.enrolled'), formatNumber(course.enrollmentCount)],
    [
      t('course.figures.completed'),
      t('course.figures.completedValue', {
        count: course.completedEnrollmentCount,
        completed: formatNumber(course.completedEnrollmentCount),
        rate: percent(course.completionRate),
      }),
    ],
    [t('course.figures.items'), formatNumber(course.itemCount)],
    [t('course.figures.passRate'), percent(course.examPassRate)],
    [t('course.figures.averageScore'), percent(course.averageExamScore)],
    [t('course.figures.attempts'), formatNumber(course.submittedAttemptCount)],
  ] as const;
  return (
    <Box
      component="dl"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
        gap: 2,
        m: 0,
      }}
    >
      {figures.map(([label, value]) => (
        <Card key={label}>
          <CardContent>
            <Typography component="dt" variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography component="dd" variant="h5" sx={{ m: 0, mt: 0.5, fontWeight: 600 }}>
              {value}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

function Progress({ course }: { course: CourseAnalytics }) {
  const { t } = useTranslation('admin');
  const { formatNumber } = useNumberFormat();
  const buckets = course.progressDistribution.map((bucket) => ({
    label:
      bucket.min === bucket.max
        ? t('course.progress.exact', { percent: bucket.min })
        : t('course.progress.range', { min: bucket.min, max: bucket.max }),
    count: bucket.count,
  }));
  return (
    <Section title={t('course.progress.title')}>
      <Card>
        <CardContent>
          {course.enrollmentCount === 0 ? (
            <Typography color="text.secondary">{t('course.progress.none')}</Typography>
          ) : (
            <Stack spacing={2}>
              <Suspense fallback={<Skeleton variant="rounded" height={240} />}>
                <ProgressChart
                  buckets={buckets}
                  seriesLabel={t('course.progress.learners')}
                  formatCount={formatNumber}
                />
              </Suspense>
              <Box
                component="ul"
                aria-label={t('course.progress.title')}
                sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, listStyle: 'none', p: 0, m: 0 }}
              >
                {buckets.map((bucket) => (
                  <Typography component="li" variant="body2" key={bucket.label}>
                    {t('course.progress.bucket', {
                      label: bucket.label,
                      count: bucket.count,
                      total: formatNumber(bucket.count),
                    })}
                  </Typography>
                ))}
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

function Items({ course }: { course: CourseAnalytics }) {
  const { t } = useTranslation(['admin', 'courses']);
  const { formatNumber, formatPercent } = useNumberFormat();
  const percent = (value: number | null) =>
    value === null ? t('dashboard.none') : formatPercent(value);
  return (
    <Section title={t('course.items.title')}>
      <DataTable
        label={t('course.items.title')}
        rows={course.items}
        rowKey={(item) => item.id}
        empty={<Typography color="text.secondary">{t('course.items.empty')}</Typography>}
        columns={[
          {
            key: 'title',
            header: t('columns.item'),
            rowHeader: true,
            cell: (item) => {
              const Icon = ITEM_ICONS[item.type];
              return (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box
                    component="span"
                    aria-hidden
                    sx={{ display: 'flex', color: 'text.secondary', '& svg': { fontSize: 20 } }}
                  >
                    <Icon />
                  </Box>
                  <span>
                    <Box component="span" sx={visuallyHidden}>
                      {t('courses:outline.typePrefix', {
                        type: t(`courses:itemType.${item.type}`),
                      })}
                    </Box>
                    {item.title}
                  </span>
                </Stack>
              );
            },
          },
          {
            key: 'module',
            header: t('columns.module'),
            hideBelow: 'md',
            cell: (item) => item.moduleTitle,
          },
          {
            key: 'completed',
            header: t('columns.completed'),
            align: 'right',
            cell: (item) =>
              course.enrollmentCount === 0
                ? formatNumber(item.completedCount)
                : t('course.items.completedOf', {
                    completed: formatNumber(item.completedCount),
                    rate: formatPercent((100 * item.completedCount) / course.enrollmentCount),
                  }),
          },
          {
            key: 'passRate',
            header: t('columns.passRate'),
            align: 'right',
            cell: (item) =>
              item.type === 'exam' ? percent(item.passRate) : t('course.items.notExam'),
          },
          {
            key: 'average',
            header: t('columns.averageScore'),
            align: 'right',
            hideBelow: 'sm',
            cell: (item) =>
              item.type === 'exam' ? percent(item.averageScore) : t('course.items.notExam'),
          },
        ]}
      />
    </Section>
  );
}

function Enrollments({ courseId, search, onSearchChange }: AdminCourseScreenProps) {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const toast = useToast();
  const { formatDate, formatRelative } = useDateFormat();
  const enrollments = useQuery(courseEnrollmentsQueryOptions(courseId, search));
  const remove = useRemoveEnrollment(courseId);
  const [removing, setRemoving] = useState<CourseEnrollment | null>(null);

  return (
    <Section title={t('course.enrollments.title')}>
      <Stack spacing={2}>
        <Box role="search" aria-label={t('filters.label')}>
          <SearchField
            label={t('course.enrollments.search')}
            value={search.q}
            onChange={(q) => {
              onSearchChange({ ...search, q, page: undefined }, { replace: true });
            }}
            sx={{ width: { xs: '100%', sm: 360 } }}
          />
        </Box>
        <DataTable
          label={t('course.enrollments.title')}
          rows={enrollments.data?.items}
          rowKey={(row) => row.userId}
          loading={enrollments.isPending}
          error={enrollments.error}
          onRetry={() => void enrollments.refetch()}
          pagination={
            enrollments.data
              ? {
                  page: enrollments.data.page,
                  pageSize: ADMIN_PAGE_SIZE,
                  total: enrollments.data.total,
                  onPageChange: (page) => {
                    onSearchChange({ ...search, page: page === 1 ? undefined : page });
                  },
                }
              : undefined
          }
          empty={
            <EmptyState
              icon={<GroupOutlined />}
              title={t(search.q ? 'course.enrollments.noMatches' : 'course.enrollments.empty')}
              description={t(
                search.q ? 'course.enrollments.noMatchesBody' : 'course.enrollments.emptyBody',
              )}
              headingLevel="h3"
            />
          }
          columns={[
            {
              key: 'learner',
              header: t('columns.learner'),
              rowHeader: true,
              cell: (row) => (
                <>
                  {row.name ?? row.email}
                  {row.name ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      component="span"
                      sx={{ display: 'block' }}
                    >
                      {row.email}
                    </Typography>
                  ) : null}
                </>
              ),
            },
            {
              key: 'progress',
              header: t('columns.progress'),
              cell: (row) => (
                <Stack spacing={0.5} sx={{ minWidth: 120 }}>
                  <Typography variant="body2">
                    {t('course.enrollments.progress', {
                      percent: row.progressPercent,
                      completed: row.completedItemCount,
                      total: row.itemCount,
                    })}
                  </Typography>
                  <LinearProgress variant="determinate" value={row.progressPercent} aria-hidden />
                </Stack>
              ),
            },
            {
              key: 'enrolled',
              header: t('columns.enrolled'),
              hideBelow: 'sm',
              cell: (row) => formatDate(row.enrolledAt),
            },
            {
              key: 'activity',
              header: t('columns.lastActivity'),
              hideBelow: 'md',
              cell: (row) =>
                row.lastActivityAt ? formatRelative(row.lastActivityAt) : t('dashboard.none'),
            },
            {
              key: 'actions',
              header: t('columns.actions'),
              align: 'right',
              cell: (row) => (
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<PersonRemoveOutlined />}
                  aria-label={t('course.enrollments.removeNamed', { name: row.name ?? row.email })}
                  onClick={() => {
                    setRemoving(row);
                  }}
                  sx={{ minHeight: 44 }}
                >
                  {t('course.enrollments.remove')}
                </Button>
              ),
            },
          ]}
        />
      </Stack>
      <ConfirmDialog
        open={removing !== null}
        tone="danger"
        title={t('course.enrollments.removeTitle', {
          name: removing?.name ?? removing?.email ?? '',
        })}
        description={t('course.enrollments.removeBody')}
        confirmLabel={t('course.enrollments.remove')}
        onClose={() => {
          setRemoving(null);
        }}
        onConfirm={async () => {
          if (!removing) return;
          try {
            await remove.mutateAsync(removing.userId);
            toast.show({
              message: t('course.enrollments.removed', { name: removing.name ?? removing.email }),
              severity: 'success',
            });
          } catch (error) {
            toast.show({ message: errorMessage(error), severity: 'error' });
          } finally {
            setRemoving(null);
          }
        }}
      />
    </Section>
  );
}
