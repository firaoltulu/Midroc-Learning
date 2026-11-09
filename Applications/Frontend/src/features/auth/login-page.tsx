import GoogleIcon from '@mui/icons-material/Google';
import {
  Alert,
  Box,
  Button,
  Divider,
  Link as MuiLink,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AuthPageFrame } from './auth-page-frame';
import { getAuthErrorKey } from '../../shared/auth/auth-errors';
import { signInWithEmail, signInWithGoogle } from '../../shared/auth/auth-operations';
import { useAuth } from '../../shared/auth/auth-provider';
import { safeReturnPath } from '../../shared/auth/route-guards';

export function LoginPage({ redirectTo }: { redirectTo?: string }) {
  const { t } = useTranslation('auth');
  const { state, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorKey, setErrorKey] = useState<ReturnType<typeof getAuthErrorKey> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const returnPath = safeReturnPath(redirectTo) ?? '/account';

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorKey(null);
    clearError();
    try {
      await signInWithEmail(email, password);
      window.location.assign(returnPath);
    } catch (error) {
      console.error('Email sign-in failed.', error);
      setErrorKey(getAuthErrorKey(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitGoogle() {
    setSubmitting(true);
    setErrorKey(null);
    clearError();
    try {
      const result = await signInWithGoogle();
      if (result === 'signedIn') window.location.assign(returnPath);
    } catch (error) {
      console.error('Google sign-in failed.', error);
      setErrorKey('google');
    } finally {
      setSubmitting(false);
    }
  }

  const sessionError = state.status === 'signedOut' ? state.error : undefined;
  const visibleError = errorKey ?? (sessionError ? getAuthErrorKey(sessionError) : null);

  return (
    <AuthPageFrame title={t('loginTitle')} description={t('loginDescription')}>
      <Stack component="form" spacing={2} onSubmit={submitEmail}>
        {visibleError && <Alert severity="error">{t(`errors.${visibleError}`)}</Alert>}
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
          autoComplete="current-password"
          required
          fullWidth
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <MuiLink component={Link} to="/forgot-password">
            {t('forgotPasswordLink')}
          </MuiLink>
        </Box>
        <Button type="submit" variant="contained" disabled={submitting}>
          {t('loginSubmit')}
        </Button>
      </Stack>
      <Divider>{t('googleSignIn')}</Divider>
      <Button
        variant="outlined"
        startIcon={<GoogleIcon />}
        onClick={() => void submitGoogle()}
        disabled={submitting}
      >
        {t('googleSignIn')}
      </Button>
      <Typography textAlign="center">
        {t('noAccount')}{' '}
        <MuiLink component={Link} to="/signup">
          {t('createAccount')}
        </MuiLink>
      </Typography>
    </AuthPageFrame>
  );
}
