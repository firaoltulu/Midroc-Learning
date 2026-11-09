import { Button, Container } from '@mui/material';
import { createRootRoute, Outlet, type ErrorComponentProps } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { AppShell } from '../shared/ui/app-shell';
import { PageHeader } from '../shared/ui/page-header';

function NotFound() {
  const { t } = useTranslation('common');

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <PageHeader title={t('notFoundTitle')} description={t('notFoundDescription')} />
    </Container>
  );
}

function RouteError({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation('common');

  useEffect(() => {
    console.error('Route rendering failed.', error);
  }, [error]);

  function retry() {
    reset();
  }

  return (
    <AppShell>
      <Container maxWidth="md" sx={{ py: 8 }}>
        <PageHeader
          title={t('routeErrorTitle')}
          description={t('routeErrorDescription')}
          actions={
            <Button variant="contained" onClick={retry}>
              {t('retry')}
            </Button>
          }
        />
      </Container>
    </AppShell>
  );
}

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RouteError,
  notFoundComponent: NotFound
});
