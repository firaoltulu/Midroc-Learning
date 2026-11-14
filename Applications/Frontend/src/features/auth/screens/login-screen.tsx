import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormTextField } from '../../../shared/ui/form-text-field';
import { RouterLink } from '../../../shared/ui/router-links';
import { AuthLayout } from '../components/auth-layout';
import { useAuthController } from '../components/auth-context';
import { AuthErrorAlert } from '../components/auth-error-alert';
import { GoogleSignIn } from '../components/google-button';
import { loginSchema, type LoginValues } from '../schemas/forms';
import type { AuthSearch } from '../schemas/search';

/**
 * After a successful sign-in the auth state changes, route guards re-run and the login route
 * sends the user on (to `redirect`, or to email verification); this screen doesn't navigate.
 */
export function LoginScreen({ search }: { search: AuthSearch }) {
  const { t } = useTranslation('auth');
  const controller = useAuthController();
  const [error, setError] = useState<unknown>(() => controller.takeRedirectError());
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      await controller.signInWithPassword(email, password);
    } catch (caught) {
      setError(caught);
    }
  });

  return (
    <AuthLayout
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <>
          {t('login.noAccount')}{' '}
          <RouterLink to="/signup" search={{ redirect: search.redirect }}>
            {t('login.createAccount')}
          </RouterLink>
        </>
      }
    >
      {search.reason === 'suspended' ? (
        <Alert severity="warning" variant="outlined">
          {t('login.suspended')}
        </Alert>
      ) : null}
      {search.reason === 'sessionExpired' ? (
        <Alert severity="info" variant="outlined">
          {t('login.sessionExpired')}
        </Alert>
      ) : null}
      <GoogleSignIn onError={setError} />
      <Stack component="form" spacing={2} noValidate onSubmit={(event) => void onSubmit(event)}>
        <AuthErrorAlert error={error} />
        <FormTextField
          {...register('email')}
          label={t('fields.email')}
          labelPlacement="above"
          placeholder={t('fields.emailPlaceholder')}
          type="email"
          autoComplete="email"
          errorKey={errors.email?.message}
        />
        <FormTextField
          {...register('password')}
          label={t('fields.password')}
          labelPlacement="above"
          placeholder={t('fields.passwordPlaceholder')}
          type="password"
          autoComplete="current-password"
          errorKey={errors.password?.message}
        />
        <RouterLink
          to="/forgot-password"
          search={{ redirect: search.redirect }}
          underline="hover"
          sx={{ alignSelf: 'flex-end', fontWeight: 600, mt: -1 }}
        >
          {t('login.forgot')}
        </RouterLink>
        <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
          {t('login.submit')}
        </Button>
      </Stack>
    </AuthLayout>
  );
}
