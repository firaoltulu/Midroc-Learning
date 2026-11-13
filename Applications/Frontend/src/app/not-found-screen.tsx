import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { ButtonLink } from '../shared/ui/router-links';

export function NotFoundScreen() {
  const { t } = useTranslation('common');

  return (
    <Stack spacing={2} sx={{ py: 8, maxWidth: 720, alignItems: 'flex-start' }}>
      <Typography variant="h2" component="h1">
        {t('notFound.title')}
      </Typography>
      <Typography color="text.secondary">{t('notFound.body')}</Typography>
      <ButtonLink to="/" variant="contained">
        {t('actions.goHome')}
      </ButtonLink>
    </Stack>
  );
}
