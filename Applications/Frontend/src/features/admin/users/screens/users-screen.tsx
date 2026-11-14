import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '../../../../shared/i18n/use-date-format';
import { DataTable } from '../../../../shared/ui/data-table';
import { EmptyState } from '../../../../shared/ui/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header';
import { RouterLink } from '../../../../shared/ui/router-links';
import { SearchField } from '../../../../shared/ui/search-field';
import {
  ACCOUNT_STATUSES,
  ROLES,
  USERS_PAGE_SIZE,
  usersQueryOptions,
  type AccountStatus,
  type Role,
  type UsersFilters,
} from '../api/users';
import { AccountStatusChip } from '../components/account-status-chip';

export interface UsersScreenProps {
  search: UsersFilters;
  onSearchChange: (next: UsersFilters, options?: { replace?: boolean }) => void;
}

/** /admin/users: search by email, filter by role and status; a row opens the user. */
export function UsersScreen({ search, onSearchChange }: UsersScreenProps) {
  const { t } = useTranslation('admin');
  const { formatDate } = useDateFormat();
  const users = useQuery(usersQueryOptions(search));
  const filtered = Boolean(search.q || search.role || search.status);

  return (
    <Stack spacing={3}>
      <PageHeader title={t('users.title')} description={t('users.description')} />
      <Stack
        role="search"
        aria-label={t('filters.label')}
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
      >
        <SearchField
          label={t('users.search')}
          value={search.q}
          onChange={(q) => {
            onSearchChange({ ...search, q, page: undefined }, { replace: true });
          }}
          sx={{ flex: 1, maxWidth: { sm: 360 } }}
        />
        <TextField
          select
          size="small"
          label={t('columns.role')}
          value={search.role ?? ''}
          onChange={(event) => {
            onSearchChange({
              ...search,
              role: (event.target.value || undefined) as Role | undefined,
              page: undefined,
            });
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">{t('filters.allRoles')}</MenuItem>
          {ROLES.map((role) => (
            <MenuItem key={role} value={role}>
              {t(`users.roles.${role}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('columns.accountStatus')}
          value={search.status ?? ''}
          onChange={(event) => {
            onSearchChange({
              ...search,
              status: (event.target.value || undefined) as AccountStatus | undefined,
              page: undefined,
            });
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">{t('filters.allStatuses')}</MenuItem>
          {ACCOUNT_STATUSES.map((status) => (
            <MenuItem key={status} value={status}>
              {t(`users.status.${status}`)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <DataTable
        label={t('users.title')}
        rows={users.data?.items}
        rowKey={(user) => user.id}
        loading={users.isPending}
        error={users.error}
        onRetry={() => void users.refetch()}
        pagination={
          users.data
            ? {
                page: users.data.page,
                pageSize: USERS_PAGE_SIZE,
                total: users.data.total,
                onPageChange: (page) => {
                  onSearchChange({ ...search, page: page === 1 ? undefined : page });
                },
              }
            : undefined
        }
        empty={
          <EmptyState
            icon={<PeopleOutlined />}
            title={t(filtered ? 'users.noMatches' : 'users.empty')}
            description={t(filtered ? 'users.noMatchesBody' : 'users.emptyBody')}
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
            key: 'email',
            header: t('columns.user'),
            rowHeader: true,
            cell: (user) => (
              <>
                <RouterLink to="/admin/users/$userId" params={{ userId: user.id }}>
                  {user.email}
                </RouterLink>
                {user.name ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    component="span"
                    sx={{ display: 'block' }}
                  >
                    {user.name}
                  </Typography>
                ) : null}
              </>
            ),
          },
          { key: 'role', header: t('columns.role'), cell: (user) => t(`users.roles.${user.role}`) },
          {
            key: 'status',
            header: t('columns.accountStatus'),
            cell: (user) => <AccountStatusChip status={user.status} />,
          },
          {
            key: 'joined',
            header: t('columns.joined'),
            hideBelow: 'sm',
            cell: (user) => formatDate(user.createdAt),
          },
        ]}
      />
    </Stack>
  );
}
