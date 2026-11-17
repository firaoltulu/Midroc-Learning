import { keyframes } from '@emotion/react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const loadingShimmer = keyframes`
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
`;

/** Wraps skeleton shapes and announces "Loading" once to assistive technology. */
export function LoadingRegion({ children, label }: { children: ReactNode; label?: string }) {
  const { t } = useTranslation('common');
  return (
    <Box
      role="status"
      aria-busy="true"
      aria-label={label ?? t('loading')}
      sx={(theme) => ({
        '& .MuiSkeleton-root': {
          backgroundColor: 'action.hover',
          backgroundImage: `linear-gradient(100deg, transparent 20%, color-mix(in srgb, ${(theme.vars ?? theme).palette.primary.main} 14%, transparent) 50%, transparent 80%)`,
          backgroundSize: '220% 100%',
          animation: `${loadingShimmer} 1.8s ease-in-out infinite`,
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            backgroundImage: 'none',
          },
        },
      })}
    >
      <Box aria-hidden>{children}</Box>
    </Box>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <LoadingRegion>
      <Stack spacing={1} sx={{ maxWidth: 720 }}>
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} variant="text" width={index === lines - 1 ? '60%' : '100%'} />
        ))}
      </Stack>
    </LoadingRegion>
  );
}

export function PageHeaderSkeleton() {
  return (
    <LoadingRegion>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Skeleton variant="text" width="40%" sx={{ fontSize: '1.75rem' }} />
        <Skeleton variant="text" width="65%" />
      </Stack>
    </LoadingRegion>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <LoadingRegion>
      <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
        {Array.from({ length: rows }, (_, index) => (
          <Stack key={index} direction="row" spacing={2} sx={{ alignItems: 'center', py: 1.5 }}>
            <Skeleton variant="rounded" width={40} height={40} />
            <Stack sx={{ flex: 1 }}>
              <Skeleton variant="text" width="50%" />
              <Skeleton variant="text" width="30%" />
            </Stack>
          </Stack>
        ))}
      </Stack>
    </LoadingRegion>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <LoadingRegion>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        }}
      >
        {Array.from({ length: count }, (_, index) => (
          <Card key={index}>
            <Skeleton variant="rectangular" sx={{ aspectRatio: '16 / 9', height: 'auto' }} />
            <CardContent>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="50%" />
            </CardContent>
          </Card>
        ))}
      </Box>
    </LoadingRegion>
  );
}
