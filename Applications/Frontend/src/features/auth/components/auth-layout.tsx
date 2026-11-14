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
 * switches. On phones the panel shrinks to a band above the form.
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
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gridTemplateRows: { xs: 'auto 1fr', md: '1fr' },
        minHeight: '100dvh',
      }}
    >
      <BrandPanel />
      <Stack sx={{ bgcolor: 'background.paper', px: { xs: 2, sm: 4 }, py: 2 }}>
        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
          <LanguageSwitcher />
          <ThemeModeSwitch />
        </Stack>
        <Stack
          sx={{ flex: 1, justifyContent: 'center', alignItems: 'center', py: { xs: 3, md: 6 } }}
        >
          <Stack spacing={3} sx={{ width: '100%', maxWidth: 420 }}>
            <Stack spacing={1}>
              <Typography variant="h2" component="h1">
                {title}
              </Typography>
              {subtitle ? (
                <Typography color="text.secondary" sx={{ fontSize: '1.0625rem' }}>
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
            {children}
            {footer ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
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
        bgcolor: 'hero.bg',
        color: 'hero.fg',
        px: { xs: 2, sm: 4, md: 6 },
        py: { xs: 3, md: 6 },
        gap: { xs: 2, md: 4 },
        // The primary-colored focus ring would vanish on the green panel.
        '& a:focus-visible': { outlineColor: (theme.vars ?? theme).palette.hero.fg },
      })}
    >
      {/* The light-lettered logo reads on the green panel in both schemes. */}
      <BrandLogo variant="full" height={44} colorScheme="dark" />
      <Stack spacing={2} sx={{ flex: 1, justifyContent: 'center', maxWidth: 560 }}>
        <Typography
          component="p"
          sx={{
            fontWeight: 700,
            lineHeight: 1.15,
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.75rem' },
          }}
        >
          {t('panel.headline')}
        </Typography>
        <Typography
          sx={{
            color: 'hero.fgMuted',
            fontSize: '1.125rem',
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
          justifyContent: 'space-between',
          color: 'hero.fgMuted',
        }}
      >
        <Typography variant="body2">{tCommon('footer.copyright')}</Typography>
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
