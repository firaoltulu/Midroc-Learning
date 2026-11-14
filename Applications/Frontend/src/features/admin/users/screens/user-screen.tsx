import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Fragment, useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../../shared/api/errors';
import { useErrorMessage } from '../../../../shared/i18n/error-messages';
import { useDateFormat } from '../../../../shared/i18n/use-date-format';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog';
import { ErrorState } from '../../../../shared/ui/error-state';
import { PageHeader } from '../../../../shared/ui/page-header';
import { ButtonLink } from '../../../../shared/ui/router-links';
import { PageHeaderSkeleton, TextSkeleton } from '../../../../shared/ui/skeletons';
import { useToast } from '../../../../shared/ui/toast/toast-context';
import { useMe } from '../../../auth';
import {
  useChangeRole,
  useChangeStatus,
  userQueryOptions,
  type AccountStatus,
  type Role,
  type User,
} from '../api/users';
import { AccountStatusChip } from '../components/account-status-chip';

/** /admin/users/$userId: profile, role change and suspend/reactivate (both confirmed). */
export function UserScreen({ userId }: { userId: string }) {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const user = useQuery(userQueryOptions(userId));

  return (
    <Stack spacing={1}>
      <ButtonLink
        to="/admin/users"
        startIcon={<ArrowBackOutlined />}
        sx={{ alignSelf: 'flex-start', ml: -1 }}
      >
        {t('users.back')}
      </ButtonLink>
      {user.isPending ? (
        <Stack spacing={3}>
          <PageHeaderSkeleton />
          <TextSkeleton lines={5} />
        </Stack>
      ) : user.isError ? (
        <ErrorState
          headingLevel="h1"
          title={
            isApiError(user.error) && user.error.status === 404 ? t('users.notFound') : undefined
          }
          description={errorMessage(user.error)}
          onRetry={() => void user.refetch()}
        />
      ) : (
        <UserDetail user={user.data} />
      )}
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <Card component="section" aria-labelledby={headingId}>
      <CardContent>
        <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 2 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

type Pending = { kind: 'role'; role: Role } | { kind: 'status'; status: AccountStatus } | null;

/** The outcome of the last change: a refusal, or a note about a partial sync. */
type Outcome = { kind: 'error'; error: unknown } | { kind: 'note'; message: string } | null;

function UserDetail({ user }: { user: User }) {
  const { t } = useTranslation('admin');
  const errorMessage = useErrorMessage();
  const toast = useToast();
  const { formatDate } = useDateFormat();
  const { data: me } = useMe();
  const changeRole = useChangeRole(user.id);
  const changeStatus = useChangeStatus(user.id);
  const [pending, setPending] = useState<Pending>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const isSelf = me?.id === user.id;
  const name = user.name ?? user.email;
  const nextRole: Role = user.role === 'admin' ? 'user' : 'admin';
  const nextStatus: AccountStatus = user.status === 'active' ? 'suspended' : 'active';

  const confirm = async () => {
    if (!pending) return;
    setOutcome(null);
    try {
      if (pending.kind === 'role') {
        const result = await changeRole.mutateAsync(pending.role);
        toast.show({
          message: t('users.roleChanged', { name, role: t(`users.roles.${pending.role}`) }),
          severity: 'success',
        });
        if (!result.claimSynced) setOutcome({ kind: 'note', message: t('users.claimNotSynced') });
      } else {
        const result = await changeStatus.mutateAsync(pending.status);
        toast.show({
          message: t(`users.statusChanged.${pending.status}`, { name }),
          severity: 'success',
        });
        if (pending.status === 'suspended' && !result.sessionsRevoked) {
          setOutcome({ kind: 'note', message: t('users.sessionsNotRevoked') });
        }
      }
    } catch (error) {
      setOutcome({ kind: 'error', error });
    } finally {
      setPending(null);
    }
  };

  const facts: [string, ReactNode][] = [
    [t('users.fields.email'), user.email],
    [t('users.fields.name'), user.name ?? t('users.noName')],
    [t('users.fields.role'), t(`users.roles.${user.role}`)],
    [t('users.fields.status'), <AccountStatusChip key="status" status={user.status} />],
    [t('users.fields.joined'), formatDate(user.createdAt)],
  ];

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <PageHeader title={name} meta={<AccountStatusChip status={user.status} />} />
      {isSelf ? (
        <Alert severity="info" variant="outlined">
          {t('users.self')}
        </Alert>
      ) : null}
      {outcome?.kind === 'error' ? (
        <Alert severity="error" variant="outlined" role="alert">
          {errorMessage(outcome.error)}
        </Alert>
      ) : null}
      {outcome?.kind === 'note' ? (
        <Alert severity="info" variant="outlined" role="status">
          {outcome.message}
        </Alert>
      ) : null}
      <Section title={t('users.profile')}>
        <Box
          component="dl"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'minmax(140px, auto) 1fr' },
            columnGap: 3,
            rowGap: { xs: 0.5, sm: 1.5 },
            m: 0,
          }}
        >
          {facts.map(([label, value]) => (
            <Fragment key={label}>
              <Typography component="dt" color="text.secondary">
                {label}
              </Typography>
              <Box component="dd" sx={{ m: 0, mb: { xs: 1.5, sm: 0 }, overflowWrap: 'anywhere' }}>
                {value}
              </Box>
            </Fragment>
          ))}
        </Box>
      </Section>
      <Section title={t('users.access')}>
        <Stack spacing={3}>
          <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
            <Typography>{t(`users.roleHint.${user.role}`)}</Typography>
            <Button
              variant="outlined"
              onClick={() => {
                setPending({ kind: 'role', role: nextRole });
              }}
            >
              {t(`users.makeRole.${nextRole}`)}
            </Button>
          </Stack>
          <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
            <Typography>{t(`users.statusHint.${user.status}`)}</Typography>
            <Button
              variant="outlined"
              color={nextStatus === 'suspended' ? 'error' : 'primary'}
              onClick={() => {
                setPending({ kind: 'status', status: nextStatus });
              }}
            >
              {t(`users.setStatus.${nextStatus}`)}
            </Button>
          </Stack>
        </Stack>
      </Section>
      <ConfirmDialog
        open={pending?.kind === 'role'}
        title={t(`users.confirmRole.${nextRole}.title`, { name })}
        description={t(`users.confirmRole.${nextRole}.body`)}
        confirmLabel={t(`users.makeRole.${nextRole}`)}
        tone={nextRole === 'user' ? 'danger' : 'default'}
        onClose={() => {
          setPending(null);
        }}
        onConfirm={confirm}
      />
      <ConfirmDialog
        open={pending?.kind === 'status'}
        title={t(`users.confirmStatus.${nextStatus}.title`, { name })}
        description={t(`users.confirmStatus.${nextStatus}.body`)}
        confirmLabel={t(`users.setStatus.${nextStatus}`)}
        tone={nextStatus === 'suspended' ? 'danger' : 'default'}
        onClose={() => {
          setPending(null);
        }}
        onConfirm={confirm}
      />
    </Stack>
  );
}
