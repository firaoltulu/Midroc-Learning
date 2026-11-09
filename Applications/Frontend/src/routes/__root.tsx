import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Box, Container, Typography } from '@mui/material';
import { useLanguage } from '../shared/i18n/language-provider';

function NotFound() {
  const { messages } = useLanguage();

  return (
    <Container component="main" id="main-content" maxWidth="md" sx={{ py: 10 }}>
      <Typography component="h1" variant="h4" gutterBottom>
        {messages.notFoundTitle}
      </Typography>
      <Typography color="text.secondary">{messages.notFoundDescription}</Typography>
    </Container>
  );
}

function RootLayout() {
  const { messages } = useLanguage();

  return (
    <Box>
      <Box
        component="a"
        className="skip-link"
        href="#main-content"
        sx={{ backgroundColor: 'background.paper', color: 'text.primary' }}
      >
        {messages.skipToContent}
      </Box>
      <Outlet />
    </Box>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound
});
