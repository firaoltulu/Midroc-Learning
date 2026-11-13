import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { t } from '../../../shared/i18n/translate';

/** Placeholder landing screen (phase 1). Replaced by the catalog in phase 6. */
export function HomeScreen() {
  return (
    <Container component="main" maxWidth="md" sx={{ py: 8 }}>
      <Stack spacing={2}>
        <Typography variant="h4" component="h1">
          {t('home.title')}
        </Typography>
        <Typography color="text.secondary">{t('home.body')}</Typography>
      </Stack>
    </Container>
  );
}
