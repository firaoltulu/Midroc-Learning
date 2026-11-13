import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** The page's only h1. */
  title: string;
  description?: string;
  /** Shown next to the title, e.g. a StatusChip. */
  meta?: ReactNode;
  /** Page-level actions; at most one primary button. */
  actions?: ReactNode;
}

export function PageHeader({ title, description, meta, actions }: PageHeaderProps) {
  return (
    <Stack
      component="header"
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: 'space-between',
        mb: 4,
      }}
    >
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          <Typography variant="h2" component="h1" sx={{ overflowWrap: 'anywhere' }}>
            {title}
          </Typography>
          {meta}
        </Stack>
        {description ? (
          <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
            {description}
          </Typography>
        ) : null}
      </Stack>
      {actions ? (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', flexShrink: 0 }}>
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}
