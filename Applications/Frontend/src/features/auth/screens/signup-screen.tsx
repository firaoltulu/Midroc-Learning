import { zodResolver } from '@hookform/resolvers/zod';
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
import { GoogleSignIn } from '../components/google-button';
import { markVerificationSent } from '../lib/verification-cooldown';
import { signUpSchema, type SignUpValues } from '../schemas/forms';
import type { AuthSearch } from '../schemas/search';

/**
 * Creates the account and sends the verification email; the route guard then moves the new,
 * unverified user to /verify-email.
 */
export function SignUpScreen({ search }: { search: AuthSearch }) {
  const { t } = useTranslation('auth');
  const controller = useAuthController();
  const [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await controller.signUpWithPassword(values);
      markVerificationSent();
    } catch (caught) {
      setError(caught);
    }
  });

  return (
    <AuthCard
      title={t('signup.title')}
      subtitle={t('signup.subtitle')}
      footer={
        <>
          {t('signup.haveAccount')}{' '}
          <RouterLink to="/login" search={{ redirect: search.redirect }}>
            {t('signup.signIn')}
          </RouterLink>
        </>
      }
    >
      <GoogleSignIn onError={setError} />
      <Stack component="form" spacing={2} noValidate onSubmit={(event) => void onSubmit(event)}>
        <AuthErrorAlert error={error} />
        <FormTextField
          {...register('name')}
          label={t('fields.name')}
          autoComplete="name"
          errorKey={errors.name?.message}
        />
        <FormTextField
          {...register('email')}
          label={t('fields.email')}
          type="email"
          autoComplete="email"
          errorKey={errors.email?.message}
        />
        <FormTextField
          {...register('password')}
          label={t('fields.newPassword')}
          type="password"
          autoComplete="new-password"
          hint={t('fields.newPasswordHelp')}
          errorKey={errors.password?.message}
        />
        <Button type="submit" variant="contained" size="large" loading={isSubmitting}>
          {t('signup.submit')}
        </Button>
      </Stack>
    </AuthCard>
  );
}
