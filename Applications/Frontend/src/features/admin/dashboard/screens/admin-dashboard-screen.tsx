import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../../../shared/i18n/error-messages';
import { useNumberFormat } from '../../../../shared/i18n/format-number';
import { useDateFormat } from '../../../../shared/i18n/use-date-format';
import { DataTable } from '../../../../shared/ui/data-table';
import { EmptyState } from '../../../../shared/ui/empty-state';
import { ErrorState } from '../../../../shared/ui/error-state';
import { PageHeader } from '../../../../shared/ui/page-header';
import { RouterLink } from '../../../../shared/ui/router-links';
import { StatusChip } from '../../../../shared/ui/status-chip';
import {
  enrollmentSeriesQueryOptions,
  overviewQueryOptions,
  topCoursesQueryOptions,
  type Overview,
  type SeriesInterval,
} from '../api/analytics';
import {
  INTERVALS,
  RANGE_PRESETS,
  rangeProblem,
  resolveRange,
  type DashboardSearch,
  type RangePreset,
} from '../model/range';

const EnrollmentChart = lazy(() => import('../components/enrollment-chart'));

const STATUSES = ['draft', 'pending_review', 'published', 'rejected', 'archived'] as const;

export interface AdminDashboardScreenProps {
  search: DashboardSearch;
  onSearchChange: (next: DashboardSearch) => void;
}

/** /admin: metric cards, enrollments over time, and the courses with the most learners. */
export function AdminDashboardScreen({ search, onSearchChange }: AdminDashboardScreenProps) {
  const { t } = useTranslation('admin');
  return (
    <Stack spacing={4}>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />
      <Metrics />
      <EnrollmentSection search={search} onSearchChange={onSearchChange} />
      <TopCourses />
    </Stack>
  );
}

function Section({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <Box component="section" aria-labelledby={headingId}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-end' }, mb: 2 }}
      >
        <Typography id={headingId} variant="h6" component="h2">
          {title}
        </Typography>
        {actions}
      </Stack>
      {children}
    </Box>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card component="li" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" component="p" sx={{ fontWeight: 600, my: 0.5 }}>
          {value}
        </Typography>
        {hint ? (
          <Typography variant="body2" color="text.secondary">
            {hint}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

const grid = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(3, minmax(0, 1fr))',
  },
  gap: 2,
  listStyle: 'none',
  p: 0,
  m: 0,
} as const;

function Metrics() {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const overview = useQuery(overviewQueryOptions());

  if (overview.isError) {
    return (
      <ErrorState
        description={errorMessage(overview.error)}
        onRetry={() => void overview.refetch()}
      />
    );
  }
  if (overview.isPending) {
    return (
      <Box component="ul" sx={grid} aria-busy="true" aria-label={t('dashboard.loading')}>
        {Array.from({ length: 6 }, (_, index) => (
          <Box component="li" key={index}>
            <Skeleton variant="rounded" height={112} />
          </Box>
        ))}
      </Box>
    );
  }
  return <MetricCards overview={overview.data} />;
}

function MetricCards({ overview }: { overview: Overview }) {
  const { t } = useTranslation('admin');
  const { formatNumber, formatPercent } = useNumberFormat();
  const waiting = overview.coursesByStatus.pending_review + overview.pendingRevisionCount;
  return (
    <Box component="ul" sx={grid} aria-label={t('dashboard.metricsLabel')}>
      <MetricCard label={t('dashboard.metrics.users')} value={formatNumber(overview.userCount)} />
      <MetricCard
        label={t('dashboard.metrics.activeLearners')}
        value={formatNumber(overview.activeLearnerCount)}
        hint={t('dashboard.metrics.last30Days')}
      />
      <MetricCard
        label={t('dashboard.metrics.enrollments')}
        value={formatNumber(overview.enrollmentsLast30Days)}
        hint={t('dashboard.metrics.enrollmentsTotal', {
          count: overview.enrollmentCount,
          total: formatNumber(overview.enrollmentCount),
        })}
      />
      <MetricCard
        label={t('dashboard.metrics.passRate')}
        value={
          overview.examPassRate === null
            ? t('dashboard.none')
            : formatPercent(overview.examPassRate)
        }
        hint={t('dashboard.metrics.attempts', {
          count: overview.submittedAttemptCount,
          total: formatNumber(overview.submittedAttemptCount),
        })}
      />
      <MetricCard
        label={t('dashboard.metrics.waiting')}
        value={formatNumber(waiting)}
        hint={
          <RouterLink to="/admin/moderation">
            {t('dashboard.metrics.waitingDetail', {
              courses: formatNumber(overview.coursesByStatus.pending_review),
              revisions: formatNumber(overview.pendingRevisionCount),
            })}
          </RouterLink>
        }
      />
      <Card component="li">
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('dashboard.metrics.coursesByStatus', { total: formatNumber(overview.courseCount) })}
          </Typography>
          <Box
            component="dl"
            sx={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              columnGap: 2,
              rowGap: 0.75,
              m: 0,
            }}
          >
            {STATUSES.map((status) => (
              <Box key={status} sx={{ display: 'contents' }}>
                <Box component="dt">
                  <StatusChip status={status} />
                </Box>
                <Box component="dd" sx={{ m: 0, alignSelf: 'center', fontWeight: 600 }}>
                  {formatNumber(overview.coursesByStatus[status])}
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

function EnrollmentSection({ search, onSearchChange }: AdminDashboardScreenProps) {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const { formatDate } = useDateFormat();
  const { formatNumber } = useNumberFormat();
  const range = resolveRange(search);
  const preset: RangePreset = search.range ?? '30d';
  const series = useQuery(enrollmentSeriesQueryOptions(range));
  const total = series.data?.reduce((sum, point) => sum + point.count, 0) ?? 0;
  const formatLabel = (date: Date) =>
    range.interval === 'week'
      ? t('dashboard.chart.weekOf', { date: formatDate(date) })
      : formatDate(date);

  return (
    <Section
      title={t('dashboard.chart.title')}
      actions={
        <RangeControls
          search={search}
          preset={preset}
          interval={range.interval}
          onSearchChange={onSearchChange}
        />
      }
    >
      <Card>
        <CardContent>
          {series.isError ? (
            <ErrorState
              description={errorMessage(series.error)}
              onRetry={() => void series.refetch()}
            />
          ) : series.isPending ? (
            <Skeleton variant="rounded" height={280} aria-label={t('dashboard.loading')} />
          ) : (
            <Stack spacing={2}>
              <Typography aria-live="polite">
                {t('dashboard.chart.summary', {
                  count: total,
                  total: formatNumber(total),
                  from: formatDate(`${range.from}T00:00:00Z`),
                  to: formatDate(`${range.to}T00:00:00Z`),
                })}
              </Typography>
              <Suspense fallback={<Skeleton variant="rounded" height={280} />}>
                <EnrollmentChart
                  points={series.data}
                  label={t('dashboard.chart.series')}
                  formatLabel={formatLabel}
                  formatCount={formatNumber}
                />
              </Suspense>
              <Box component="details">
                <Box
                  component="summary"
                  sx={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}
                >
                  {t('dashboard.chart.showTable')}
                </Box>
                <Box sx={{ maxHeight: 320, overflow: 'auto', mt: 1 }}>
                  <Table size="small" stickyHeader aria-label={t('dashboard.chart.title')}>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t(`dashboard.chart.bucket.${range.interval}`)}</TableCell>
                        <TableCell align="right">{t('dashboard.chart.series')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {series.data.map((point) => (
                        <TableRow key={point.date}>
                          <TableCell component="th" scope="row">
                            {formatLabel(new Date(point.date))}
                          </TableCell>
                          <TableCell align="right">{formatNumber(point.count)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

function RangeControls({
  search,
  preset,
  interval,
  onSearchChange,
}: {
  search: DashboardSearch;
  preset: RangePreset;
  interval: SeriesInterval;
  onSearchChange: (next: DashboardSearch) => void;
}) {
  const { t } = useTranslation('admin');
  const current = resolveRange(search);
  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);
  const problem = preset === 'custom' ? rangeProblem(from, to) : null;

  const applyCustom = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
    if (nextFrom && nextTo && !rangeProblem(nextFrom, nextTo)) {
      onSearchChange({ ...search, range: 'custom', from: nextFrom, to: nextTo });
    }
  };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{ flexWrap: 'wrap' }}
      useFlexGap
    >
      <TextField
        select
        size="small"
        label={t('dashboard.range.label')}
        value={preset}
        onChange={(event) => {
          const next = event.target.value as RangePreset;
          onSearchChange(
            next === 'custom'
              ? { ...search, range: next, from, to }
              : { range: next === '30d' ? undefined : next, interval: search.interval },
          );
        }}
        sx={{ minWidth: 180 }}
      >
        {RANGE_PRESETS.map((option) => (
          <MenuItem key={option} value={option}>
            {t(`dashboard.range.presets.${option}`)}
          </MenuItem>
        ))}
      </TextField>
      {preset === 'custom' ? (
        <>
          <TextField
            type="date"
            size="small"
            label={t('dashboard.range.from')}
            value={from}
            onChange={(event) => {
              applyCustom(event.target.value, to);
            }}
            error={Boolean(problem)}
            helperText={problem ? t(`dashboard.range.problems.${problem}`) : undefined}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="date"
            size="small"
            label={t('dashboard.range.to')}
            value={to}
            onChange={(event) => {
              applyCustom(from, event.target.value);
            }}
            error={Boolean(problem)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </>
      ) : null}
      <TextField
        select
        size="small"
        label={t('dashboard.range.interval')}
        value={interval}
        onChange={(event) => {
          onSearchChange({ ...search, interval: event.target.value as SeriesInterval });
        }}
        sx={{ minWidth: 140 }}
      >
        {INTERVALS.map((option) => (
          <MenuItem key={option} value={option}>
            {t(`dashboard.range.intervals.${option}`)}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

function TopCourses() {
  const { t } = useTranslation('admin');
  const { formatNumber, formatPercent } = useNumberFormat();
  const courses = useQuery(topCoursesQueryOptions());
  const rows = courses.data?.filter((course) => course.enrollmentCount > 0).slice(0, 10);

  return (
    <Section title={t('dashboard.top.title')}>
      <DataTable
        label={t('dashboard.top.title')}
        rows={rows}
        rowKey={(course) => course.id}
        loading={courses.isPending}
        error={courses.error}
        onRetry={() => void courses.refetch()}
        empty={
          <EmptyState
            icon={<InsightsOutlined />}
            title={t('dashboard.top.empty')}
            description={t('dashboard.top.emptyBody')}
            headingLevel="h3"
          />
        }
        columns={[
          {
            key: 'title',
            header: t('columns.course'),
            rowHeader: true,
            cell: (course) => (
              <RouterLink to="/admin/courses/$courseId" params={{ courseId: course.id }}>
                {course.title}
              </RouterLink>
            ),
          },
          {
            key: 'status',
            header: t('columns.status'),
            cell: (course) => <StatusChip status={course.status} />,
          },
          {
            key: 'enrollments',
            header: t('columns.enrollments'),
            align: 'right',
            cell: (course) => formatNumber(course.enrollmentCount),
          },
          {
            key: 'completion',
            header: t('columns.completionRate'),
            align: 'right',
            cell: (course) =>
              course.completionRate === null
                ? t('dashboard.none')
                : formatPercent(course.completionRate),
          },
        ]}
      />
    </Section>
  );
}
