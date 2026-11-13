import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthController } from './auth-context';

/** "Continue with Google" plus the "or" divider. Errors go to `onError`. */
export function GoogleSignIn({ onError }: { onError: (error: unknown) => void }) {
  const { t } = useTranslation('auth');
  const controller = useAuthController();
  const [busy, setBusy] = useState(false);

  return (
    <Stack spacing={3}>
      <Button
        variant="outlined"
        size="large"
        fullWidth
        loading={busy}
        startIcon={<GoogleMark />}
        onClick={() => {
          setBusy(true);
          controller
            .signInWithGoogle()
            .catch(onError)
            .finally(() => {
              setBusy(false);
            });
        }}
      >
        {t('google.button')}
      </Button>
      <Divider>{t('google.divider')}</Divider>
    </Stack>
  );
}

/**
 * Google's "G" mark: third-party brand artwork (Google's sign-in guidelines require these
 * colors), so it's the one place outside the theme with fixed fills.
 */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="rgb(255 193 7)"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="rgb(255 61 0)"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="rgb(76 175 80)"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="rgb(25 118 210)"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
