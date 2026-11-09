import { useTranslation } from 'react-i18next';
import { AuthPageFrame } from './auth-page-frame';

export function AdminPage() {
  const { t } = useTranslation('auth');
  return <AuthPageFrame title={t('accountTitle')} description={t('accountDescription')} />;
}
