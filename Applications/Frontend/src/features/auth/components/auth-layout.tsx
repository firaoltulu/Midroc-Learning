import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../../../shared/ui/brand/brand-logo';
import { LanguageSwitcher } from '../../../shared/ui/language-switcher';
import { RouterLink } from '../../../shared/ui/router-links';
import { ThemeModeSwitch } from '../../../shared/ui/theme-mode-switch';

/**
 * The split screen of every public auth page: a deep-green brand panel (logo, headline,
 * copyright and the privacy / terms links) and the form column with the language and theme
 * switches. On phones the brand panel becomes a compact header above the form.
 */
export function AuthLayout({
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
    <Box
      sx={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' },
        gridTemplateRows: { xs: 'auto 1fr', md: '1fr' },
        minHeight: '100dvh',
      }}
    >
      <BrandPanel />
      <Stack
        sx={{
          bgcolor: 'background.default',
          px: { xs: 2, sm: 4, lg: 6 },
          py: { xs: 1.5, sm: 2 },
          minWidth: 0,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <LanguageSwitcher />
          <ThemeModeSwitch />
        </Stack>
        <Stack
          sx={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            py: { xs: 2, md: 5 },
          }}
        >
          <Stack
            spacing={{ xs: 2.5, sm: 3 }}
            sx={{
              width: '100%',
              maxWidth: 480,
              p: { xs: 2.25, sm: 4 },
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              boxShadow: (theme) => theme.shadows[1],
            }}
          >
            <Stack spacing={1}>
              <Typography
                variant="h2"
                component="h1"
                sx={{ lineHeight: 1.25, overflowWrap: 'anywhere' }}
              >
                {title}
              </Typography>
              {subtitle ? (
                <Typography
                  color="text.secondary"
                  sx={{ fontSize: '1.0625rem', lineHeight: 1.7, overflowWrap: 'anywhere' }}
                >
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
            {children}
            {footer ? (
              <Typography
                color="text.secondary"
                sx={{ textAlign: 'center', lineHeight: 1.7, overflowWrap: 'anywhere' }}
              >
                {footer}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

const LEGAL_LINKS = [
  { to: '/privacy', labelKey: 'footer.privacy' },
  { to: '/terms', labelKey: 'footer.terms' },
] as const;

function BrandPanel() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const { t: tSite } = useTranslation('site');

  return (
    <Stack
      sx={(theme) => ({
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        minWidth: 0,
        bgcolor: 'hero.bg',
        color: 'hero.fg',
        px: { xs: 2.5, sm: 4, md: 6 },
        py: { xs: 1.5, sm: 3.5, md: 6 },
        gap: { xs: 1.5, sm: 2.5, md: 4 },
        minHeight: { xs: 180, sm: 260, md: '100dvh' },
        // The primary-colored focus ring would vanish on the green panel.
        '& a:focus-visible': { outlineColor: (theme.vars ?? theme).palette.hero.fg },
        '&::before': {
          content: '""',
          position: 'absolute',
          display: { xs: 'none', md: 'block' },
          width: { xs: 280, md: 520 },
          height: { xs: 280, md: 520 },
          insetInlineEnd: { xs: -170, md: -250 },
          insetBlockEnd: { xs: -180, md: -260 },
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '50%',
          boxShadow: '0 0 0 36px rgba(255, 255, 255, 0.025), 0 0 0 72px rgba(255, 255, 255, 0.025)',
          pointerEvents: 'none',
          zIndex: -1,
        },
      })}
    >
      <RouterLink
        to="/"
        aria-label={tCommon('brand.homeLink')}
        sx={{ display: 'inline-flex', alignSelf: 'flex-start', borderRadius: 0.5 }}
      >
        <BrandLogo variant="full" height={32} colorScheme="dark" decorative />
      </RouterLink>
      <Stack
        spacing={{ xs: 0, sm: 2 }}
        sx={{ flex: 1, width: '100%', minWidth: 0, justifyContent: 'center', maxWidth: 560 }}
      >
        <Typography
          component="p"
          sx={{
            fontWeight: 700,
            lineHeight: 1.2,
            fontSize: { xs: '1.125rem', sm: '2rem', md: 'clamp(2rem, 3.5vw, 3rem)' },
            maxWidth: { xs: '24ch', sm: '16ch' },
            overflowWrap: 'anywhere',
          }}
        >
          {t('panel.headline')}
        </Typography>
        <Typography
          sx={{
            color: 'hero.fgMuted',
            fontSize: { xs: '0.9375rem', sm: '1.0625rem' },
            lineHeight: 1.7,
            maxWidth: '44ch',
            display: { xs: 'none', sm: 'block' },
          }}
        >
          {t('panel.body')}
        </Typography>
      </Stack>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{
          flexWrap: 'wrap',
          justifyContent: { xs: 'flex-end', sm: 'space-between' },
          alignItems: 'center',
          color: 'hero.fgMuted',
          rowGap: 1,
        }}
      >
        <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
          {tCommon('footer.copyright')}
        </Typography>
        <Stack direction="row" spacing={1.5} component="nav" aria-label={tSite('footer.label')}>
          {LEGAL_LINKS.map((link) => (
            <RouterLink
              key={link.to}
              to={link.to}
              variant="body2"
              underline="hover"
              sx={{ color: 'inherit', py: 0.25, borderRadius: 0.5 }}
            >
              {tSite(link.labelKey)}
            </RouterLink>
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
