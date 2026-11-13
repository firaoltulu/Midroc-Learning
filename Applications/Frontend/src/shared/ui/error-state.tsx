import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from '../i18n/translate';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Shows a "Try again" button when provided. */
  onRetry?: () => void;
  headingLevel?: 'h1' | 'h2' | 'h3';
}

/** Shown in place of content when a query fails. Never shows raw server text. */
export function ErrorState({ title, description, onRetry, headingLevel = 'h2' }: ErrorStateProps) {
  const { t } = useTranslation('common');

  return (
    <Stack
      role="alert"
      spacing={2}
      sx={{
        alignItems: 'flex-start',
        py: 4,
        px: 3,
        border: 1,
        borderColor: 'divider',
        borderRadius: '14px',
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <ErrorOutlineOutlined aria-hidden sx={{ color: 'error.main', mt: 0.25 }} />
        <Stack spacing={0.5}>
          <Typography variant="h4" component={headingLevel}>
            {title ?? t('errorState.title')}
          </Typography>
          <Typography color="text.secondary">{description ?? t('errorState.body')}</Typography>
        </Stack>
      </Stack>
      {onRetry ? (
        <Button variant="outlined" onClick={onRetry}>
          {t('actions.retry')}
        </Button>
      ) : null}
    </Stack>
  );
}
