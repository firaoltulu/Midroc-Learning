import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  headingLevel?: 1 | 2 | 3;
}

const headingVariants = { 1: 'h1', 2: 'h2', 3: 'h3' } as const;

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  headingLevel = 1
}: PageHeaderProps) {
  const headingVariant = headingVariants[headingLevel];

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      justifyContent="space-between"
      spacing={2}
      sx={{ mb: 4 }}
    >
      <Box>
        {eyebrow && (
          <Typography variant="overline" color="text.secondary">
            {eyebrow}
          </Typography>
        )}
        <Typography
          component={headingVariant}
          variant={headingVariant}
          sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem' } }}
        >
          {title}
        </Typography>
        {description && (
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
            {description}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>{actions}</Box>
      )}
    </Stack>
  );
}
