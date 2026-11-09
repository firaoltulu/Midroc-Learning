import { Alert, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { AuthPageFrame } from './auth-page-frame';
import { useAuth } from '../../shared/auth/auth-provider';
import { getAuthErrorKey } from '../../shared/auth/auth-errors';

export function AccountPage() {
  const { t } = useTranslation('auth');
  const { state, signOut, refreshProfile } = useAuth();
  const [signOutError, setSignOutError] = useState<ReturnType<typeof getAuthErrorKey> | null>(null);

  async function handleSignOut() {
    setSignOutError(null);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign-out failed.', error);
      setSignOutError(getAuthErrorKey(error));
    }
  }

  if (state.status !== 'signedIn') {
    return <AuthPageFrame title={t('accountTitle')} description={t('accountDescription')} />;
  }

  return (
    <AuthPageFrame title={t('accountTitle')} description={t('accountDescription')}>
      <Stack spacing={2}>
        {state.profileError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void refreshProfile()}>
                {t('retryProfile')}
              </Button>
            }
          >
            {t('errors.profile')}
          </Alert>
        )}
        {signOutError && <Alert severity="error">{t(`errors.${signOutError}`)}</Alert>}
        <Typography>{state.profile?.name ?? state.user.displayName ?? state.user.email}</Typography>
        <Typography>
          {t('role')}: {state.profile?.role === 'admin' ? t('roleAdmin') : t('roleUser')}
        </Typography>
        <Typography>
          {t('status')}:{' '}
          {state.profile?.status === 'active'
            ? t('active')
            : state.profile
              ? t('statusSuspended')
              : t('notAvailable')}
        </Typography>
        <Button variant="outlined" onClick={() => void handleSignOut()}>
          {t('signOut')}
        </Button>
      </Stack>
    </AuthPageFrame>
  );
}
