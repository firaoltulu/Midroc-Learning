import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** An Outlined icon element, e.g. <SchoolOutlined />. */
  icon?: ReactNode;
  title: string;
  /** One line inviting the next step. */
  description?: string;
  /** The single action, usually a button. */
  action?: ReactNode;
  /** Heading level for the title so the page outline stays correct. */
  headingLevel?: 'h2' | 'h3';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel = 'h2',
}: EmptyStateProps) {
  return (
    <Stack
      spacing={2}
      sx={{
        alignItems: 'center',
        textAlign: 'center',
        py: 6,
        px: 3,
        border: 1,
        borderColor: 'divider',
        borderStyle: 'dashed',
        borderRadius: '14px',
      }}
    >
      {icon ? (
        <Box
          aria-hidden
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: 'surfaceMuted',
            color: 'text.secondary',
            '& svg': { fontSize: 28 },
          }}
        >
          {icon}
        </Box>
      ) : null}
      <Stack spacing={0.5} sx={{ maxWidth: 480 }}>
        <Typography variant="h4" component={headingLevel}>
          {title}
        </Typography>
        {description ? <Typography color="text.secondary">{description}</Typography> : null}
      </Stack>
      {action}
    </Stack>
  );
}
