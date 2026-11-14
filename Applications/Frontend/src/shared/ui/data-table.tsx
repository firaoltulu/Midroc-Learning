import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../i18n/error-messages';
import { useNumberFormat } from '../i18n/format-number';
import { ErrorState } from './error-state';
import { LoadingRegion } from './skeletons';

export interface DataColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** Row header (the cell that names the row, e.g. a title or email). */
  rowHeader?: boolean;
  /** Hidden below this breakpoint (secondary columns on narrow screens). */
  hideBelow?: 'sm' | 'md';
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  /** Accessible name of the table. */
  label: string;
  columns: DataColumn<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  /** Shown instead of the table when there are no rows (an EmptyState). */
  empty: ReactNode;
  pagination?: DataTablePagination;
  /** The table scrolls under its sticky header beyond this height. */
  maxHeight?: number | string;
}

const display = (hideBelow: DataColumn<unknown>['hideBelow']) =>
  hideBelow ? { display: { xs: 'none', [hideBelow]: 'table-cell' } } : undefined;

/**
 * The admin table (dense layout): sticky header, skeleton rows while loading, an error state
 * with retry, the empty state, and pagination with a "1–20 of 45" summary.
 */
export function DataTable<T>({
  label,
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  onRetry,
  empty,
  pagination,
  maxHeight = 'min(70vh, 720px)',
}: DataTableProps<T>) {
  const { t } = useTranslation('common');
  const errorMessage = useErrorMessage();
  const { formatNumber } = useNumberFormat();

  if (error) return <ErrorState description={errorMessage(error)} onRetry={onRetry} />;
  if (!loading && rows?.length === 0) return <>{empty}</>;

  const pageCount = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;
  const first = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const last = pagination ? Math.min(pagination.total, pagination.page * pagination.pageSize) : 0;

  const table = (
    <TableContainer
      sx={{ maxHeight, border: 1, borderColor: 'divider', borderRadius: 2.5 }}
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <Table stickyHeader size="small" aria-label={label}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align}
                sx={{ fontWeight: 600, whiteSpace: 'nowrap', ...display(column.hideBelow) }}
              >
                {column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading || !rows
            ? Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key} sx={display(column.hideBelow)}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((row) => (
                <TableRow key={rowKey(row)} hover>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.align}
                      component={column.rowHeader ? 'th' : 'td'}
                      scope={column.rowHeader ? 'row' : undefined}
                      sx={{ overflowWrap: 'anywhere', ...display(column.hideBelow) }}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Stack spacing={2}>
      {loading ? <LoadingRegion>{table}</LoadingRegion> : table}
      {pagination && !loading && pagination.total > 0 ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="body2" color="text.secondary" aria-live="polite">
            {t('table.range', {
              from: formatNumber(first),
              to: formatNumber(last),
              total: formatNumber(pagination.total),
            })}
          </Typography>
          {pageCount > 1 ? (
            <Pagination
              count={pageCount}
              page={pagination.page}
              shape="rounded"
              aria-label={t('table.pages')}
              getItemAriaLabel={(type, page, selected) => {
                switch (type) {
                  case 'page':
                    return t(selected ? 'table.currentPage' : 'table.page', { page: page ?? 0 });
                  case 'first':
                  case 'last':
                  case 'next':
                  case 'previous':
                    return t(`table.${type}`);
                  default:
                    return '';
                }
              }}
              onChange={(_, page) => {
                pagination.onPageChange(page);
              }}
            />
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
}
