import { Box, Card, CardContent, Container, Stack } from '@mui/material';
import type { PropsWithChildren } from 'react';
import { BrandLogo } from '../../shared/brand/brand-logo';
import { PageHeader } from '../../shared/ui/page-header';

export function AuthPageFrame({
  title,
  description,
  children
}: PropsWithChildren<{ title: string; description: string }>) {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <Card>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack spacing={3}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <BrandLogo />
            </Box>
            <PageHeader title={title} description={description} />
            {children}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
