import { Alert, Button, Link as MuiLink, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AuthPageFrame } from './auth-page-frame';
import { useAuth } from '../../shared/auth/auth-provider';
import { sendVerificationEmail, refreshVerifiedUser } from '../../shared/auth/auth-operations';
import { getAuthErrorKey } from '../../shared/auth/auth-errors';

export function VerifyEmailPage() {
  const { t } = useTranslation('auth');
  const { state, refreshProfile } = useAuth();
  const [sent, setSent] = useState(false);
  const [stillPending, setStillPending] = useState(false);
  const [errorKey, setErrorKey] = useState<ReturnType<typeof getAuthErrorKey> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function resend() {
    setSubmitting(true);
    setErrorKey(null);
    try {
      await sendVerificationEmail();
      setSent(true);
    } catch (error) {
      console.error('Verification email could not be sent.', error);
      setErrorKey(getAuthErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function checkVerification() {
    setSubmitting(true);
    setErrorKey(null);
    try {
      const verified = await refreshVerifiedUser();
      if (!verified) {
        setStillPending(true);
        return;
      }
      await refreshProfile();
      window.location.assign('/account');
    } catch (error) {
      console.error('Email verification status could not be refreshed.', error);
      setErrorKey(getAuthErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageFrame title={t('verifyTitle')} description={t('verifyDescription')}>
      <Stack spacing={2}>
        {state.status === 'loading' && <Alert severity="info">{t('loading')}</Alert>}
        {stillPending && <Alert severity="info">{t('verifyStillPending')}</Alert>}
        {state.status === 'signedOut' && (
          <MuiLink component={Link} to="/login">
            {t('loginSubmit')}
          </MuiLink>
        )}
        {sent && <Alert severity="success">{t('verificationSent')}</Alert>}
        {errorKey && <Alert severity="error">{t(`errors.${errorKey}`)}</Alert>}
        {state.status === 'signedIn' && !state.emailVerified && (
          <>
            <Button variant="outlined" onClick={() => void resend()} disabled={submitting}>
              {t('sendVerification')}
            </Button>
            <Button
              variant="contained"
              onClick={() => void checkVerification()}
              disabled={submitting}
            >
              {t('refreshVerification')}
            </Button>
          </>
        )}
      </Stack>
    </AuthPageFrame>
  );
}
