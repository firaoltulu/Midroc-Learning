import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormTextField } from '../../../shared/ui/form-text-field';
import { RouterLink } from '../../../shared/ui/router-links';
import { AuthCard } from '../components/auth-card';
import { useAuthController } from '../components/auth-context';
import { AuthErrorAlert } from '../components/auth-error-alert';
import { authErrorKey } from '../lib/auth-errors';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas/forms';
import type { AuthSearch } from '../schemas/search';

/**
 * Always confirms in the same words whether or not the account exists, so the page can't be
 * used to discover who has an account.
 */
export function ForgotPasswordScreen({ search }: { search: AuthSearch }) {
  const { t } = useTranslation('auth');
  const controller = useAuthController();
  const [error, setError] = useState<unknown>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await controller.sendPasswordReset(email);
      setSentTo(email);
    } catch (caught) {
      // An unknown account gets the same confirmation as a known one.
      if (authErrorKey(caught) === 'invalidCredential') setSentTo(email);
      else setError(caught);
    }
  });

  return (
    <AuthCard
      title={t('forgot.title')}
      subtitle={t('forgot.subtitle')}
      footer={
        <RouterLink to="/login" search={{ redirect: search.redirect }}>
          {t('forgot.back')}
        </RouterLink>
      }
    >
      {sentTo ? (
        <Alert severity="success" variant="outlined" role="status">
          {t('forgot.sent', { email: sentTo })}
        </Alert>
      ) : (
        <Stack component="form" spacing={2} noValidate onSubmit={(event) => void onSubmit(event)}>
          <AuthErrorAlert error={error} />
          <FormTextField
            {...register('email')}
            label={t('fields.email')}
            type="email"
            autoComplete="email"
            errorKey={errors.email?.message}
          />
          <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
            {t('forgot.submit')}
          </Button>
        </Stack>
      )}
    </AuthCard>
  );
}
