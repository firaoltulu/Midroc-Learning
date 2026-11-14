import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ButtonLink } from '../../../../shared/ui/router-links';

const SECTIONS = [
  { to: '/admin', key: 'dashboard', exact: true },
  { to: '/admin/moderation', key: 'moderation', exact: false },
  { to: '/admin/courses', key: 'courses', exact: false },
  { to: '/admin/users', key: 'users', exact: false },
  { to: '/admin/videos', key: 'videos', exact: false },
] as const;

/**
 * The admin area's frame: a section navigation (links, current one marked with
 * aria-current) above the section's page. Dense, desktop-first; scrolls sideways on phones.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation('admin');
  return (
    <Stack spacing={3}>
      <Box
        component="nav"
        aria-label={t('nav.label')}
        sx={{ borderBottom: 1, borderColor: 'divider', overflowX: 'auto' }}
      >
        <Stack direction="row" spacing={0.5} component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {SECTIONS.map((section) => (
            <li key={section.key}>
              <ButtonLink
                to={section.to}
                activeOptions={{ exact: section.exact, includeSearch: false }}
                color="inherit"
                sx={{
                  minHeight: 44,
                  borderRadius: 0,
                  borderBottom: 2,
                  borderColor: 'transparent',
                  color: 'text.secondary',
                  whiteSpace: 'nowrap',
                  '&[aria-current="page"]': {
                    color: 'primary.main',
                    borderColor: 'primary.main',
                    fontWeight: 600,
                  },
                }}
              >
                {t(`nav.${section.key}`)}
              </ButtonLink>
            </li>
          ))}
        </Stack>
      </Box>
      <Box>{children}</Box>
    </Stack>
  );
}
