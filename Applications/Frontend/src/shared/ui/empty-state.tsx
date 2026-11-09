import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={2}
      sx={{
        px: 3,
        py: { xs: 5, sm: 7 },
        textAlign: 'center',
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        backgroundColor: 'background.paper'
      }}
    >
      {icon && (
        <Box aria-hidden="true" sx={{ color: 'primary.main', display: 'flex' }}>
          {icon}
        </Box>
      )}
      <Box>
        <Typography component="h2" variant="h3">
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 480 }}>
          {description}
        </Typography>
      </Box>
      {action}
    </Stack>
  );
}
