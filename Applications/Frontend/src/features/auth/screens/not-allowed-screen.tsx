import LockOutlined from '@mui/icons-material/LockOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { ButtonLink } from '../../../shared/ui/router-links';

/** Friendly screen for signed-in users who open an admin-only page. */
export function NotAllowedScreen() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');

  return (
    <Stack spacing={2} sx={{ py: 8, maxWidth: 720, alignItems: 'flex-start' }}>
      <Box aria-hidden sx={{ color: 'text.secondary', '& svg': { fontSize: 40 } }}>
        <LockOutlined />
      </Box>
      <Typography variant="h2" component="h1">
        {t('notAllowed.title')}
      </Typography>
      <Typography color="text.secondary">{t('notAllowed.body')}</Typography>
      <ButtonLink to="/" variant="contained">
        {tCommon('actions.goHome')}
      </ButtonLink>
    </Stack>
  );
}
