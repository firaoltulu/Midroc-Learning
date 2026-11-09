import { Button, Container } from '@mui/material';
import { createRootRoute, Outlet, type ErrorComponentProps } from '@tanstack/react-router';
import { useEffect } from 'react';
import { AppShell } from '../shared/ui/app-shell';
import { PageHeader } from '../shared/ui/page-header';
import { useLanguage } from '../shared/i18n/language-provider';

function NotFound() {
  const { messages } = useLanguage();

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <PageHeader title={messages.notFoundTitle} description={messages.notFoundDescription} />
    </Container>
  );
}

function RouteError({ error, reset }: ErrorComponentProps) {
  const { messages } = useLanguage();

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
          title={messages.routeErrorTitle}
          description={messages.routeErrorDescription}
          actions={
            <Button variant="contained" onClick={retry}>
              {messages.retry}
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
