import { Alert, Button, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { AuthPageFrame } from './auth-page-frame';
import { useAuth } from '../../shared/auth/auth-provider';
import { getAuthErrorKey } from '../../shared/auth/auth-errors';

export function SuspendedPage() {
  const { t } = useTranslation('auth');
  const { signOut } = useAuth();
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

  return (
    <AuthPageFrame title={t('suspendedTitle')} description={t('suspendedDescription')}>
      <Stack>
        {signOutError && <Alert severity="error">{t(`errors.${signOutError}`)}</Alert>}
        <Button variant="outlined" onClick={() => void handleSignOut()}>
          {t('signOut')}
        </Button>
      </Stack>
    </AuthPageFrame>
  );
}
