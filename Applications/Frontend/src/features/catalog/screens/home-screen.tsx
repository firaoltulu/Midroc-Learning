import { useTranslation } from '../../../shared/i18n/translate';
import { PageHeader } from '../../../shared/ui/page-header';

/** Placeholder landing screen. Replaced by the catalog in phase 6. */
export function HomeScreen() {
  const { t } = useTranslation('common');
  return <PageHeader title={t('home.title')} description={t('home.body')} />;
}
