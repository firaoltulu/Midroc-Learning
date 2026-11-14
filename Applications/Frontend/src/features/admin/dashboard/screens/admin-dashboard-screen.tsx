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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
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
  comparisonRange,
  INTERVALS,
  periodChange,
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

/**
 * /admin: metric cards (users, enrollments in 30 days against the 30 before, exam pass rate,
 * waiting for review), courses by status, enrollments over time and the top courses.
 */
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
        <Typography
          component="p"
          sx={{ fontWeight: 700, fontSize: '2rem', lineHeight: 1.2, my: 0.5 }}
        >
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
    lg: 'repeat(4, minmax(0, 1fr))',
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
        {Array.from({ length: 4 }, (_, index) => (
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
  const comparison = useQuery(enrollmentSeriesQueryOptions(comparisonRange()));
  const change = comparison.data ? periodChange(comparison.data) : undefined;
  const waiting = overview.coursesByStatus.pending_review + overview.pendingRevisionCount;
  return (
    <Stack spacing={2}>
      <Box component="ul" sx={grid} aria-label={t('dashboard.metricsLabel')}>
        <MetricCard
          label={t('dashboard.metrics.users')}
          value={formatNumber(overview.userCount)}
          hint={t('dashboard.metrics.activeHint', {
            count: overview.activeLearnerCount,
            active: formatNumber(overview.activeLearnerCount),
          })}
        />
        <MetricCard
          label={t('dashboard.metrics.enrollments')}
          value={formatNumber(overview.enrollmentsLast30Days)}
          hint={
            change === undefined
              ? t('dashboard.metrics.enrollmentsTotal', {
                  count: overview.enrollmentCount,
                  total: formatNumber(overview.enrollmentCount),
                })
              : change === null
                ? t('dashboard.metrics.noPrevious')
                : t('dashboard.metrics.change', {
                    change: `${change > 0 ? '+' : ''}${formatNumber(change)}%`,
                  })
          }
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
      </Box>
      <Card>
        <CardContent sx={{ '&:last-child': { pb: 2 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            useFlexGap
            sx={{ alignItems: { md: 'center' }, flexWrap: 'wrap' }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.metrics.coursesByStatus', {
                total: formatNumber(overview.courseCount),
              })}
            </Typography>
            <Box
              component="dl"
              sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2.5, rowGap: 1, m: 0 }}
            >
              {STATUSES.map((status) => (
                <Stack key={status} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Box component="dt">
                    <StatusChip status={status} />
                  </Box>
                  <Box component="dd" sx={{ m: 0, fontWeight: 700 }}>
                    {formatNumber(overview.coursesByStatus[status])}
                  </Box>
                </Stack>
              ))}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
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
    <Card component="section" aria-labelledby="enrollments-title">
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 2 }}
        >
          <Typography id="enrollments-title" component="h2" sx={{ fontWeight: 700 }}>
            {t('dashboard.chart.title')}
          </Typography>
          <RangeControls
            search={search}
            preset={preset}
            interval={range.interval}
            onSearchChange={onSearchChange}
          />
        </Stack>
        {series.isError ? (
          <ErrorState
            description={errorMessage(series.error)}
            onRetry={() => void series.refetch()}
          />
        ) : series.isPending ? (
          <Skeleton variant="rounded" height={280} aria-label={t('dashboard.loading')} />
        ) : (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" aria-live="polite">
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
      <ToggleButtonGroup
        exclusive
        size="small"
        value={interval}
        aria-label={t('dashboard.range.interval')}
        onChange={(_event, next: SeriesInterval | null) => {
          if (next) onSearchChange({ ...search, interval: next });
        }}
        sx={{
          gap: 0.75,
          alignSelf: { sm: 'center' },
          '& .MuiToggleButtonGroup-grouped': {
            m: 0,
            border: 0,
            borderRadius: '8px !important',
            px: 1.5,
            minHeight: 36,
            color: 'text.secondary',
            bgcolor: 'surfaceMuted',
            '&.Mui-selected, &.Mui-selected:hover': {
              bgcolor: 'status.published.bg',
              color: 'status.published.fg',
              fontWeight: 700,
            },
          },
        }}
      >
        {INTERVALS.map((option) => (
          <ToggleButton key={option} value={option}>
            {t(`dashboard.range.intervals.${option}`)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
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
          {
            key: 'rating',
            header: t('columns.rating'),
            align: 'right',
            cell: (course) =>
              course.ratingAverage === null ? t('dashboard.none') : course.ratingAverage.toFixed(1),
          },
        ]}
      />
    </Section>
  );
}
