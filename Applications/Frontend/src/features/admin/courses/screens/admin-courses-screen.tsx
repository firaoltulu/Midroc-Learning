import LibraryBooksOutlined from '@mui/icons-material/LibraryBooksOutlined';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNumberFormat } from '../../../../shared/i18n/format-number';
import { useDateFormat } from '../../../../shared/i18n/use-date-format';
import { DataTable } from '../../../../shared/ui/data-table';
import { EmptyState } from '../../../../shared/ui/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header';
import { RouterLink } from '../../../../shared/ui/router-links';
import { SearchField } from '../../../../shared/ui/search-field';
import { StatusChip } from '../../../../shared/ui/status-chip';
import type { CourseStatus } from '../../../courses';
import {
  ADMIN_PAGE_SIZE,
  adminCoursesQueryOptions,
  type AdminCoursesFilters,
} from '../api/admin-courses';

const COURSE_STATUSES: CourseStatus[] = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'archived',
];

export interface AdminCoursesScreenProps {
  search: AdminCoursesFilters;
  onSearchChange: (next: AdminCoursesFilters, options?: { replace?: boolean }) => void;
}

/** /admin/courses: every course with search and a status filter; a row opens its analytics. */
export function AdminCoursesScreen({ search, onSearchChange }: AdminCoursesScreenProps) {
  const { t } = useTranslation(['admin', 'common']);
  const { formatNumber } = useNumberFormat();
  const { formatDate } = useDateFormat();
  const courses = useQuery(adminCoursesQueryOptions(search));
  const filtered = Boolean(search.q || search.status);

  return (
    <Stack spacing={3}>
      <PageHeader title={t('courses.title')} description={t('courses.description')} />
      <Stack
        role="search"
        aria-label={t('filters.label')}
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
      >
        <SearchField
          label={t('courses.search')}
          value={search.q}
          onChange={(q) => {
            onSearchChange({ ...search, q, page: undefined }, { replace: true });
          }}
          sx={{ flex: 1, maxWidth: { sm: 360 } }}
        />
        <TextField
          select
          size="small"
          label={t('columns.status')}
          value={search.status ?? ''}
          onChange={(event) => {
            const status = (event.target.value || undefined) as CourseStatus | undefined;
            onSearchChange({ ...search, status, page: undefined });
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">{t('filters.allStatuses')}</MenuItem>
          {COURSE_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {t(`common:status.${status}`)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <DataTable
        label={t('courses.title')}
        rows={courses.data?.items}
        rowKey={(course) => course.id}
        loading={courses.isPending}
        error={courses.error}
        onRetry={() => void courses.refetch()}
        pagination={
          courses.data
            ? {
                page: courses.data.page,
                pageSize: ADMIN_PAGE_SIZE,
                total: courses.data.total,
                onPageChange: (page) => {
                  onSearchChange({ ...search, page: page === 1 ? undefined : page });
                },
              }
            : undefined
        }
        empty={
          <EmptyState
            icon={<LibraryBooksOutlined />}
            title={t(filtered ? 'courses.noMatches' : 'courses.empty')}
            description={t(filtered ? 'courses.noMatchesBody' : 'courses.emptyBody')}
            action={
              filtered ? (
                <Button
                  variant="outlined"
                  onClick={() => {
                    onSearchChange({});
                  }}
                >
                  {t('filters.clear')}
                </Button>
              ) : undefined
            }
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
            key: 'owner',
            header: t('columns.owner'),
            hideBelow: 'md',
            cell: (course) => (
              <>
                {course.ownerName ?? course.ownerEmail}
                {course.ownerName ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    component="span"
                    sx={{ display: 'block' }}
                  >
                    {course.ownerEmail}
                  </Typography>
                ) : null}
              </>
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
            key: 'updated',
            header: t('columns.updated'),
            hideBelow: 'sm',
            cell: (course) => formatDate(course.updatedAt),
          },
        ]}
      />
    </Stack>
  );
}
