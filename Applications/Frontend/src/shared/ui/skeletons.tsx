import { Card, CardContent, Skeleton, Stack } from '@mui/material';

export function PageSkeleton({ label }: { label: string }) {
  return (
    <Stack role="status" aria-busy="true" aria-label={label} spacing={2}>
      <Skeleton variant="text" width="38%" height={42} />
      <Skeleton variant="text" width="66%" />
      <Skeleton variant="rounded" height={180} />
    </Stack>
  );
}

export function CardSkeleton({ label }: { label: string }) {
  return (
    <Card role="status" aria-busy="true" aria-label={label}>
      <CardContent>
        <Skeleton variant="text" width="48%" height={30} />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="rounded" height={64} sx={{ mt: 2 }} />
      </CardContent>
    </Card>
  );
}
