import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNumberFormat } from '../../../../shared/i18n/format-number';
import { useDateFormat } from '../../../../shared/i18n/use-date-format';
import { DataTable } from '../../../../shared/ui/data-table';
import { EmptyState } from '../../../../shared/ui/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header';
import { ButtonLink, RouterLink } from '../../../../shared/ui/router-links';
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

/** Filter chips: one group per filter, the chosen one tinted (pressed), toggled off again. */
const chipGroup = {
  flexWrap: 'wrap',
  gap: 0.75,
  '& .MuiToggleButtonGroup-grouped': {
    m: 0,
    border: 0,
    borderRadius: '8px !important',
    px: 1.25,
    minHeight: 36,
    color: 'text.secondary',
    bgcolor: 'surfaceMuted',
    fontWeight: 500,
    '&.Mui-selected, &.Mui-selected:hover': {
      bgcolor: 'status.published.bg',
      color: 'status.published.fg',
      fontWeight: 700,
    },
  },
} as const;

/**
 * /admin/users: the number of users, search by name or email, role and status chips, and a
 * table (user, role, status, courses owned, courses taken, joined, Manage).
 */
export function UsersScreen({ search, onSearchChange }: UsersScreenProps) {
  const { t } = useTranslation('admin');
  const { formatDate } = useDateFormat();
  const { formatNumber } = useNumberFormat();
  const users = useQuery(usersQueryOptions(search));
  const filtered = Boolean(search.q || search.role || search.status);

  return (
    <Stack spacing={3}>
      <PageHeader
        title={t('users.title')}
        actions={
          users.data ? (
            <Typography color="text.secondary" sx={{ alignSelf: 'center' }}>
              {t('users.count', { count: users.data.total, total: formatNumber(users.data.total) })}
            </Typography>
          ) : undefined
        }
      />
      <Stack
        role="search"
        aria-label={t('filters.label')}
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        useFlexGap
        sx={{ alignItems: { md: 'center' }, flexWrap: 'wrap' }}
      >
        <SearchField
          label={t('users.search')}
          value={search.q}
          onChange={(q) => {
            onSearchChange({ ...search, q, page: undefined }, { replace: true });
          }}
          sx={{ flex: 1, maxWidth: { md: 380 } }}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={search.role ?? 'all'}
          aria-label={t('columns.role')}
          onChange={(_event, next: Role | 'all' | null) => {
            if (next === null) return;
            onSearchChange({ ...search, role: next === 'all' ? undefined : next, page: undefined });
          }}
          sx={chipGroup}
        >
          <ToggleButton value="all">{t('filters.allRoles')}</ToggleButton>
          {ROLES.slice()
            .reverse()
            .map((role) => (
              <ToggleButton key={role} value={role}>
                {t(`users.roleFilter.${role}`)}
              </ToggleButton>
            ))}
        </ToggleButtonGroup>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={search.status ?? null}
          aria-label={t('columns.accountStatus')}
          onChange={(_event, next: AccountStatus | null) => {
            onSearchChange({ ...search, status: next ?? undefined, page: undefined });
          }}
          sx={chipGroup}
        >
          {ACCOUNT_STATUSES.map((status) => (
            <ToggleButton key={status} value={status}>
              {t(`users.status.${status}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
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
            key: 'user',
            header: t('columns.user'),
            rowHeader: true,
            cell: (user) => (
              <>
                <RouterLink
                  to="/admin/users/$userId"
                  params={{ userId: user.id }}
                  underline="hover"
                  color="inherit"
                  sx={{ fontWeight: 700, display: 'block' }}
                >
                  {user.name ?? user.email}
                </RouterLink>
                {user.name ? (
                  <Typography variant="body2" color="text.secondary" component="span">
                    {user.email}
                  </Typography>
                ) : null}
              </>
            ),
          },
          {
            key: 'role',
            header: t('columns.role'),
            cell: (user) => (
              <Chip
                size="small"
                label={t(`users.roleShort.${user.role}`)}
                sx={
                  user.role === 'admin'
                    ? { bgcolor: 'status.published.bg', color: 'status.published.fg' }
                    : { bgcolor: 'surfaceMuted', color: 'text.secondary' }
                }
              />
            ),
          },
          {
            key: 'status',
            header: t('columns.accountStatus'),
            cell: (user) => <AccountStatusChip status={user.status} />,
          },
          {
            key: 'courses',
            header: t('columns.ownedCourses'),
            align: 'right',
            hideBelow: 'md',
            cell: (user) => formatNumber(user.courseCount),
          },
          {
            key: 'enrolled',
            header: t('columns.enrolled'),
            align: 'right',
            hideBelow: 'md',
            cell: (user) => formatNumber(user.enrollmentCount),
          },
          {
            key: 'joined',
            header: t('columns.joined'),
            hideBelow: 'sm',
            cell: (user) => formatDate(user.createdAt),
          },
          {
            key: 'manage',
            header: t('columns.actions'),
            align: 'right',
            cell: (user) => (
              <ButtonLink
                to="/admin/users/$userId"
                params={{ userId: user.id }}
                variant="outlined"
                size="small"
                sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {t('users.manage')}{' '}
                <Box component="span" sx={visuallyHidden}>
                  {user.name ?? user.email}
                </Box>
              </ButtonLink>
            ),
          },
        ]}
      />
    </Stack>
  );
}
