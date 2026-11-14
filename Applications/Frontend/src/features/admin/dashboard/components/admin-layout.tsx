import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../../../../shared/ui/brand/brand-logo';
import { LanguageSwitcher } from '../../../../shared/ui/language-switcher';
import { ButtonLink, RouterLink } from '../../../../shared/ui/router-links';
import { ThemeModeSwitch } from '../../../../shared/ui/theme-mode-switch';
import { UserMenu } from '../../../auth';

const SECTIONS = [
  { to: '/admin', key: 'dashboard', exact: true },
  { to: '/admin/moderation', key: 'moderation', exact: false },
  { to: '/admin/courses', key: 'courses', exact: false },
  { to: '/admin/users', key: 'users', exact: false },
  { to: '/admin/videos', key: 'videos', exact: false },
] as const;

/**
 * The admin area's own frame (the app header is hidden here): a top bar with the logo, an
 * "Admin" chip, the language and theme switches and the account menu; the section navigation
 * on the left (a scrolling row on phones); the section's page on the right. Dense,
 * desktop-first.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['admin', 'common']);
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Stack
        component="header"
        direction="row"
        spacing={1.5}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          minHeight: 64,
          alignItems: 'center',
          px: { xs: 1.5, sm: 3 },
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <RouterLink
          to="/"
          aria-label={t('common:brand.homeLink')}
          sx={{ display: 'inline-flex', borderRadius: 1, p: 0.5, flexShrink: 0 }}
        >
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <BrandLogo variant="mark" height={28} decorative />
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <BrandLogo variant="full" height={34} decorative />
          </Box>
        </RouterLink>
        <Chip
          size="small"
          label={t('admin:layout.badge')}
          sx={{ bgcolor: 'status.published.bg', color: 'status.published.fg', fontWeight: 600 }}
        />
        <Box sx={{ flex: 1 }} />
        <LanguageSwitcher />
        <ThemeModeSwitch />
        <UserMenu />
      </Stack>

      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' },
        }}
      >
        <Box
          component="nav"
          aria-label={t('admin:nav.label')}
          sx={{
            bgcolor: 'background.paper',
            borderRight: { md: 1 },
            borderBottom: { xs: 1, md: 0 },
            borderColor: 'divider',
            p: { xs: 1, md: 2 },
            overflowX: { xs: 'auto', md: 'visible' },
          }}
        >
          <Stack
            component="ul"
            direction={{ xs: 'row', md: 'column' }}
            spacing={0.5}
            sx={{ listStyle: 'none', m: 0, p: 0, position: { md: 'sticky' }, top: { md: 80 } }}
          >
            {SECTIONS.map((section) => (
              <li key={section.key}>
                <ButtonLink
                  to={section.to}
                  activeOptions={{ exact: section.exact, includeSearch: false }}
                  color="inherit"
                  fullWidth
                  sx={{
                    justifyContent: 'flex-start',
                    minHeight: 44,
                    px: 1.5,
                    color: 'text.secondary',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    '&[aria-current="page"]': {
                      color: 'primary.main',
                      bgcolor: 'surfaceMuted',
                      fontWeight: 700,
                    },
                  }}
                >
                  {t(`admin:nav.${section.key}`)}
                </ButtonLink>
              </li>
            ))}
          </Stack>
        </Box>
        <Box sx={{ minWidth: 0, px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 4 } }}>
          <Box sx={{ maxWidth: 1200 }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}
