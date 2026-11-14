import MenuOutlined from '@mui/icons-material/MenuOutlined';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../../shared/ui/brand/brand-logo';
import { LanguageSwitcher } from '../../shared/ui/language-switcher';
import { ButtonLink, ListItemLink, RouterLink } from '../../shared/ui/router-links';
import { ThemeModeSwitch } from '../../shared/ui/theme-mode-switch';
import { isVerified, useAuth, useMe, UserMenu } from '../../features/auth';
import { visibleNavItems } from './nav-items';
import { PageFocus } from './page-focus';

export const MAIN_CONTENT_ID = 'main-content';

const drawerWidth = 280;

/**
 * Slim top bar (logo, primary nav, language switcher, theme switch, user menu), mobile
 * navigation drawer, skip link and the main landmark. Navigation and the user menu appear
 * only once a verified user is signed in; admin entries follow the role from /me.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn' && isVerified(auth.user);
  const { data: me } = useMe({ enabled: signedIn });
  const navItems = visibleNavItems(signedIn, signedIn && me?.role === 'admin');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <SkipLink />
      <PageFocus mainId={MAIN_CONTENT_ID} />

      <AppBar position="sticky">
        <Container maxWidth="lg" disableGutters>
          <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 }, px: { xs: 1, sm: 2 } }}>
            <IconButton
              aria-label={t('shell.openNavigation')}
              aria-controls={drawerOpen ? 'mobile-navigation' : undefined}
              aria-expanded={drawerOpen}
              onClick={() => {
                setDrawerOpen(true);
              }}
              sx={{ display: { md: 'none' } }}
            >
              <MenuOutlined />
            </IconButton>

            <RouterLink
              to="/"
              aria-label={t('brand.homeLink')}
              sx={{ display: 'inline-flex', alignItems: 'center', borderRadius: 1, mr: 2 }}
            >
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <BrandLogo variant="mark" height={28} decorative />
              </Box>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <BrandLogo variant="full" height={36} decorative />
              </Box>
            </RouterLink>

            <Box
              component="nav"
              aria-label={t('shell.primaryNavigation')}
              sx={{ display: { xs: 'none', md: 'block' } }}
            >
              <Stack
                component="ul"
                direction="row"
                spacing={0.5}
                sx={{ listStyle: 'none', m: 0, p: 0 }}
              >
                {navItems.map((item) => (
                  <li key={item.to}>
                    <ButtonLink
                      to={item.to}
                      color="inherit"
                      sx={{
                        color: 'text.secondary',
                        '&[data-status="active"]': {
                          color: 'primary.main',
                          bgcolor: 'surfaceMuted',
                        },
                      }}
                    >
                      {t(item.labelKey)}
                    </ButtonLink>
                  </li>
                ))}
              </Stack>
            </Box>

            <Box sx={{ flex: 1 }} />
            <LanguageSwitcher />
            <ThemeModeSwitch />
            {signedIn ? <UserMenu /> : null}
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        id="mobile-navigation"
        open={drawerOpen}
        onClose={closeDrawer}
        sx={{ display: { md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
      >
        <Box sx={{ p: 2 }}>
          <BrandLogo variant="full" height={32} />
        </Box>
        <Box component="nav" aria-label={t('shell.primaryNavigation')}>
          <List>
            {navItems.map(({ to, labelKey, Icon }) => (
              <li key={to}>
                <ListItemLink
                  to={to}
                  onClick={closeDrawer}
                  sx={{
                    minHeight: 48,
                    '&[data-status="active"]': { color: 'primary.main', bgcolor: 'surfaceMuted' },
                    '&[data-status="active"] .MuiListItemIcon-root': { color: 'primary.main' },
                  }}
                >
                  <ListItemIcon>
                    <Icon />
                  </ListItemIcon>
                  <ListItemText primary={t(labelKey)} />
                </ListItemLink>
              </li>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        sx={{ flex: 1, outline: 'none', py: { xs: 3, sm: 5 } }}
      >
        <Container maxWidth="lg">{children}</Container>
      </Box>
    </Box>
  );
}

function SkipLink() {
  const { t } = useTranslation('common');
  return (
    <Box
      component="a"
      href={`#${MAIN_CONTENT_ID}`}
      sx={(theme) => ({
        position: 'absolute',
        left: 8,
        top: 8,
        zIndex: theme.zIndex.tooltip + 1,
        px: 2,
        py: 1,
        borderRadius: 1,
        bgcolor: 'background.paper',
        color: 'primary.main',
        border: 1,
        borderColor: 'primary.main',
        fontWeight: 600,
        textDecoration: 'none',
        transform: 'translateY(-200%)',
        '&:focus-visible, &:focus': { transform: 'none' },
      })}
    >
      {t('shell.skipToContent')}
    </Box>
  );
}
