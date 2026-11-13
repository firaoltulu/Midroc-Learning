import Alert from '@mui/material/Alert';
import { useTranslation } from 'react-i18next';
import { authErrorKey } from '../lib/auth-errors';

/**
 * Translated message for a Firebase error (never the provider's own text). A cancelled
 * Google popup is the user's own action, so it shows nothing.
 */
export function AuthErrorAlert({ error }: { error: unknown }) {
  const { t } = useTranslation('auth');
  if (!error) return null;
  const key = authErrorKey(error);
  if (key === 'cancelled') return null;
  return (
    <Alert severity="error" variant="outlined" role="alert">
      {t(`errors.${key}`)}
    </Alert>
  );
}
