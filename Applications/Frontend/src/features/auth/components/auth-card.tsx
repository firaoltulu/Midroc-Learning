import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { BrandLogo } from '../../../shared/ui/brand/brand-logo';

/** The calm, centered card used by every public auth page, with the full logo. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Stack sx={{ alignItems: 'center', py: { xs: 2, sm: 6 } }}>
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
          <Stack spacing={3}>
            <BrandLogo variant="full" height={40} />
            <Stack spacing={0.5}>
              <Typography variant="h3" component="h1">
                {title}
              </Typography>
              {subtitle ? <Typography color="text.secondary">{subtitle}</Typography> : null}
            </Stack>
            {children}
          </Stack>
        </CardContent>
      </Card>
      {footer ? (
        <Typography color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
          {footer}
        </Typography>
      ) : null}
    </Stack>
  );
}
