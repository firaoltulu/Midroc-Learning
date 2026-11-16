import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import type { ReactNode } from 'react';

/**
 * The full-width hero surface on home and course pages. Use it on routes with the
 * `fullBleed` shell layout.
 */
export function HeroBand({
  children,
  tone = 'brand',
}: {
  children: ReactNode;
  tone?: 'brand' | 'surface';
}) {
  return (
    <Box
      sx={(theme) => ({
        bgcolor: tone === 'brand' ? 'hero.bg' : 'background.default',
        color: tone === 'brand' ? 'hero.fg' : 'text.primary',
        ...(tone === 'surface'
          ? {
              backgroundImage:
                'radial-gradient(ellipse at 86% 12%, rgba(var(--mui-palette-primary-mainChannel) / 0.1), transparent 34%), linear-gradient(135deg, var(--mui-palette-background-default) 0%, var(--mui-palette-background-paper) 58%, var(--mui-palette-background-default) 100%)',
            }
          : {}),
        py: { xs: 4, md: 7 },
        '& :focus-visible': {
          outlineColor:
            tone === 'brand'
              ? (theme.vars ?? theme).palette.hero.fg
              : (theme.vars ?? theme).palette.primary.main,
        },
      })}
    >
      <Container maxWidth="lg">{children}</Container>
    </Box>
  );
}
