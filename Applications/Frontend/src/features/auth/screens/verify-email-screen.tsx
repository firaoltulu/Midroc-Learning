import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../components/auth-layout';
import { useAuthController, useSignOut } from '../components/auth-context';
import { AuthErrorAlert } from '../components/auth-error-alert';
import { cooldownRemaining, markVerificationSent } from '../lib/verification-cooldown';

/**
 * Shown to signed-in password accounts until their email is verified. "I've verified" reloads
 * the user; once verified, the route guard sends them on to where they were going.
 */
export function VerifyEmailScreen({ email }: { email: string }) {
  const { t } = useTranslation('auth');
  const controller = useAuthController();
  const signOut = useSignOut();
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<'resent' | 'notYet' | 'wait' | null>(null);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(() => cooldownRemaining());

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown(cooldownRemaining());
    }, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [cooldown]);

  const checkVerified = async () => {
    setError(null);
    setNotice(null);
    setChecking(true);
    try {
      await controller.reloadUser();
      const state = controller.getState();
      if (state.status === 'signedIn' && !state.user.emailVerified) setNotice('notYet');
    } catch (caught) {
      setError(caught);
    } finally {
      setChecking(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    setSending(true);
    try {
      await controller.sendVerificationEmail();
      markVerificationSent();
      setCooldown(cooldownRemaining());
      setNotice('resent');
    } catch (caught) {
      setError(caught);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout title={t('verify.title')} subtitle={t('verify.body', { email })}>
      <Stack spacing={2}>
        <AuthErrorAlert error={error} />
        {notice === 'resent' ? (
          <Alert severity="success" variant="outlined" role="status">
            {t('verify.resent')}
          </Alert>
        ) : null}
        {notice === 'wait' && cooldown > 0 ? (
          <Alert severity="info" variant="outlined" role="status">
            {t('verify.wait', { seconds: cooldown })}
          </Alert>
        ) : null}
        {notice === 'notYet' ? (
          <Alert severity="info" variant="outlined" role="status">
            {t('verify.notYet')}
          </Alert>
        ) : null}
        <Button
          variant="contained"
          size="large"
          loading={checking}
          onClick={() => void checkVerified()}
        >
          {t('verify.verified')}
        </Button>
        <Button
          variant="outlined"
          loading={sending}
          // Not disabled during the cooldown: a click explains the wait instead.
          onClick={() => {
            if (cooldown > 0) setNotice('wait');
            else void resend();
          }}
        >
          {cooldown > 0 ? t('verify.resendIn', { seconds: cooldown }) : t('verify.resend')}
        </Button>
        <Button onClick={() => void signOut()}>{t('verify.useAnother')}</Button>
      </Stack>
    </AuthLayout>
  );
}
