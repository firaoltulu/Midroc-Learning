import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import type { ReactNode } from 'react';

/**
 * The full-width deep-green band at the top of the home and course pages (palette.hero). Use it
 * on routes with the `fullBleed` shell layout. Text inherits the band's color; focus rings
 * switch to it, since the primary color would vanish on the green.
 */
export function HeroBand({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={(theme) => ({
        bgcolor: 'hero.bg',
        color: 'hero.fg',
        py: { xs: 4, md: 7 },
        '& :focus-visible': { outlineColor: (theme.vars ?? theme).palette.hero.fg },
      })}
    >
      <Container maxWidth="lg">{children}</Container>
    </Box>
  );
}
