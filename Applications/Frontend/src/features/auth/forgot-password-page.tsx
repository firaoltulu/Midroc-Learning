import { Alert, Button, Link as MuiLink, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AuthPageFrame } from './auth-page-frame';
import { getAuthErrorKey } from '../../shared/auth/auth-errors';
import { sendPasswordReset } from '../../shared/auth/auth-operations';

export function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [errorKey, setErrorKey] = useState<ReturnType<typeof getAuthErrorKey> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorKey(null);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (error) {
      console.error('Password reset request failed.', error);
      setErrorKey(getAuthErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageFrame title={t('forgotPasswordTitle')} description={t('forgotPasswordDescription')}>
      <Stack component="form" spacing={2} onSubmit={submit}>
        {sent && <Alert severity="success">{t('resetSent')}</Alert>}
        {errorKey && <Alert severity="error">{t(`errors.${errorKey}`)}</Alert>}
        <TextField
          label={t('email')}
          type="email"
          autoComplete="email"
          required
          fullWidth
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" variant="contained" disabled={submitting}>
          {t('resetSubmit')}
        </Button>
        <MuiLink component={Link} to="/login" textAlign="center">
          {t('loginSubmit')}
        </MuiLink>
      </Stack>
    </AuthPageFrame>
  );
}
