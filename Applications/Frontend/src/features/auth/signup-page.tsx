import { Alert, Button, Link as MuiLink, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AuthPageFrame } from './auth-page-frame';
import { getAuthErrorKey } from '../../shared/auth/auth-errors';
import { createAccount } from '../../shared/auth/auth-operations';

export function SignupPage() {
  const { t } = useTranslation('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorKey, setErrorKey] = useState<ReturnType<typeof getAuthErrorKey> | null>(null);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorKey(null);
    setPasswordMismatch(false);
    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    setSubmitting(true);
    try {
      await createAccount(name, email, password);
      window.location.assign('/verify-email');
    } catch (error) {
      console.error('Account creation failed.', error);
      setErrorKey(getAuthErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageFrame title={t('signupTitle')} description={t('signupDescription')}>
      <Stack component="form" spacing={2} onSubmit={submit}>
        {errorKey && <Alert severity="error">{t(`errors.${errorKey}`)}</Alert>}
        {passwordMismatch && <Alert severity="error">{t('passwordMismatch')}</Alert>}
        <TextField
          label={t('name')}
          autoComplete="name"
          fullWidth
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label={t('email')}
          type="email"
          autoComplete="email"
          required
          fullWidth
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label={t('password')}
          type="password"
          autoComplete="new-password"
          inputProps={{ minLength: 6 }}
          required
          fullWidth
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <TextField
          label={t('confirmPassword')}
          type="password"
          autoComplete="new-password"
          required
          fullWidth
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <Button type="submit" variant="contained" disabled={submitting}>
          {t('signupSubmit')}
        </Button>
      </Stack>
      <Typography textAlign="center">
        {t('hasAccount')}{' '}
        <MuiLink component={Link} to="/login">
          {t('loginSubmit')}
        </MuiLink>
      </Typography>
    </AuthPageFrame>
  );
}
