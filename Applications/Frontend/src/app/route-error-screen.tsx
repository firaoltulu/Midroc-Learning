import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from '../shared/i18n/translate';
import { ButtonLink } from '../shared/ui/router-links';

/** Route-level error boundary: a calm message with a retry, never the raw error text. */
export function RouteErrorScreen({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation('common');
  const router = useRouter();

  useEffect(() => {
    if (import.meta.env.DEV) console.error(error);
  }, [error]);

  return (
    <Stack role="alert" spacing={2} sx={{ py: 8, maxWidth: 720 }}>
      <Typography variant="h2" component="h1">
        {t('routeError.title')}
      </Typography>
      <Typography color="text.secondary">{t('routeError.body')}</Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={() => {
            reset();
            void router.invalidate();
          }}
        >
          {t('actions.retry')}
        </Button>
        <ButtonLink to="/" variant="text">
          {t('actions.goHome')}
        </ButtonLink>
      </Stack>
    </Stack>
  );
}
