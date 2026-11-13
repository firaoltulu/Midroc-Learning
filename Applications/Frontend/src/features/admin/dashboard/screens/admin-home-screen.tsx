import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../../shared/ui/page-header';

/** Placeholder for the admin area (proves the admin guard). Phase 11 builds the dashboard. */
export function AdminHomeScreen() {
  const { t } = useTranslation('admin');
  return <PageHeader title={t('home.title')} description={t('home.body')} />;
}
