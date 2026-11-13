import { useTranslation } from 'react-i18next';
import { PageHeader } from './page-header';
import { ButtonLink } from './router-links';

/**
 * Temporary stand-in for screens that arrive in later phases (player, editor), so links to
 * their routes already work. Removed when the last one is built.
 */
export function UpcomingScreen() {
  const { t } = useTranslation('common');
  return (
    <PageHeader
      title={t('upcoming.title')}
      description={t('upcoming.body')}
      actions={
        <ButtonLink variant="outlined" to="/courses">
          {t('upcoming.action')}
        </ButtonLink>
      }
    />
  );
}
