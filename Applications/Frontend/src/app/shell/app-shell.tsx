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
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../../shared/ui/brand/brand-logo';
import { LanguageSwitcher } from '../../shared/ui/language-switcher';
import { ButtonLink, ListItemLink, RouterLink } from '../../shared/ui/router-links';
import { ThemeModeSwitch } from '../../shared/ui/theme-mode-switch';
import { isVerified, useAuth, useMe, UserMenu } from '../../features/auth';
import { HeaderSearch } from './header-search';
import { visibleNavItems, type NavItem } from './nav-items';
import { PageFocus } from './page-focus';
import { useShellLayout } from './shell-layout';

export const MAIN_CONTENT_ID = 'main-content';

const drawerWidth = 300;

/**
 * The frame around every page: skip link, header, main landmark and footer. Routes choose
 * how much of it they get with `staticData.layout` (see shell-layout.ts): the player, the
 * exam and the sign-in pages bring their own slim top bar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const layout = useShellLayout();

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <SkipLink />
      <PageFocus mainId={MAIN_CONTENT_ID} />
      {layout === 'focus' ? null : <AppHeader />}
      <Box
        component="main"
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        sx={{
          flex: 1,
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          ...(layout === 'page' ? { py: { xs: 3, sm: 5 } } : {}),
        }}
      >
        {layout === 'page' ? <Container maxWidth="lg">{children}</Container> : children}
      </Box>
      {layout === 'focus' ? null : <AppFooter />}
    </Box>
  );
}

/**
 * Logo, Explore, the course search, My learning / My courses (and Administration for admins),
 * the language and theme switches and the user menu. Below `md` the links and the search move
 * into a drawer. Signed-out visitors have no destinations: the logo, the switches, Sign in and
 * Join for free (from `sm`).
 */
function AppHeader() {
  const { t } = useTranslation('common');
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn' && isVerified(auth.user);
  const { data: me } = useMe({ enabled: signedIn });
  const navItems = visibleNavItems(signedIn, signedIn && me?.role === 'admin');
  const hasNav = navItems.length > 0;
  const [explore, ...links] = navItems;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  return (
    <>
      <AppBar
        position="sticky"
        sx={(theme) => ({
          position: 'sticky',
          overflow: 'visible',
          backgroundColor: 'rgba(var(--mui-palette-background-paperChannel) / 0.84)',
          backdropFilter: 'blur(18px) saturate(160%)',
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: '0 12px 36px rgba(13, 36, 25, 0.1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '0 0 auto',
            height: 2,
            background: `linear-gradient(90deg, transparent, ${(theme.vars ?? theme).palette.primary.main} 24%, ${(theme.vars ?? theme).palette.secondary.main} 76%, transparent)`,
            opacity: 0.7,
          },
          '@supports not (backdrop-filter: blur(1px))': {
            backgroundColor: (theme.vars ?? theme).palette.background.paper,
          },
        })}
      >
        <Container maxWidth="lg" disableGutters>
          <Toolbar
            sx={{
              gap: { xs: 0.75, md: 1.25 },
              minHeight: { xs: 64, sm: 72 },
              px: { xs: 1, sm: 2 },
            }}
          >
            {hasNav ? (
              <IconButton
                aria-label={t('shell.openNavigation')}
                aria-controls={drawerOpen ? 'mobile-navigation' : undefined}
                aria-expanded={drawerOpen}
                onClick={() => {
                  setDrawerOpen(true);
                }}
                sx={(theme) => ({
                  display: { md: 'none' },
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.6)',
                  transition: theme.transitions.create(['transform', 'background-color']),
                  '&:hover': { bgcolor: 'surfaceMuted', transform: 'rotate(-8deg)' },
                })}
              >
                <MenuOutlined />
              </IconButton>
            ) : null}

            <RouterLink
              to="/"
              aria-label={t('brand.homeLink')}
              sx={(theme) => ({
                display: 'inline-flex',
                alignItems: 'center',
                border: 1,
                borderColor: 'divider',
                borderRadius: 0,
                flexShrink: 0,
                px: 0.75,
                py: 0.375,
                transition: theme.transitions.create([
                  'transform',
                  'background-color',
                  'border-color',
                ]),
                '&:hover': {
                  bgcolor: 'surfaceMuted',
                  borderColor: 'primary.main',
                  transform: 'translateY(-1px)',
                },
                '&:active': { transform: 'scale(0.98)' },
              })}
            >
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <BrandLogo variant="mark" height={28} decorative />
              </Box>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <BrandLogo variant="full" height={36} decorative />
              </Box>
            </RouterLink>

            {hasNav && explore ? (
              <Box
                component="nav"
                aria-label={t('shell.primaryNavigation')}
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  alignItems: 'center',
                  gap: { md: 1, lg: 1.5 },
                  flex: 1,
                  minWidth: 0,
                  ml: { md: 0.5, lg: 1 },
                }}
              >
                <ButtonLink
                  to={explore.to}
                  variant="outlined"
                  sx={(theme) => ({
                    flexShrink: 0,
                    borderRadius: 0,
                    borderWidth: 1,
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    bgcolor: 'background.paper',
                    px: 2,
                    transition: theme.transitions.create(
                      ['transform', 'background-color', 'border-color', 'color'],
                      { duration: theme.transitions.duration.short },
                    ),
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      bgcolor: 'surfaceMuted',
                      borderColor: 'primary.dark',
                    },
                    '&:active': { transform: 'translateY(0) scale(0.98)' },
                  })}
                >
                  {t(explore.labelKey)}
                </ButtonLink>
                <Box sx={{ flex: '1 1 200px', minWidth: 120, maxWidth: 440 }}>
                  <HeaderSearch />
                </Box>
                <Stack
                  component="ul"
                  direction="row"
                  spacing={0.5}
                  sx={{
                    listStyle: 'none',
                    m: 0,
                    p: 0,
                    ml: 'auto',
                    flexShrink: 0,
                    gap: { md: 0, lg: 0.25 },
                  }}
                >
                  {links.map((item) => (
                    <li key={item.to}>
                      <HeaderLink item={item} />
                    </li>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Box sx={{ flex: 1 }} />
            )}
            {hasNav ? <Box sx={{ flex: 1, display: { md: 'none' } }} /> : null}

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                p: 0,
                flexShrink: 0,
              }}
            >
              <LanguageSwitcher />
              <ThemeModeSwitch />
            </Box>
            {signedIn ? <UserMenu /> : null}
            {auth.status === 'signedOut' ? (
              <>
                <ButtonLink
                  to="/login"
                  variant="text"
                  sx={(theme) => ({
                    flexShrink: 0,
                    borderRadius: 0,
                    border: 1,
                    borderColor: 'divider',
                    px: { xs: 1, sm: 1.5 },
                    transition: theme.transitions.create([
                      'transform',
                      'background-color',
                      'border-color',
                    ]),
                    '&:hover': {
                      bgcolor: 'surfaceMuted',
                      borderColor: 'primary.main',
                      transform: 'translateY(-1px)',
                    },
                  })}
                >
                  {t('shell.signIn')}
                </ButtonLink>
                <ButtonLink
                  to="/signup"
                  variant="outlined"
                  sx={(theme) => ({
                    flexShrink: 0,
                    borderRadius: 0,
                    borderWidth: 1,
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    px: { xs: 1.5, sm: 2 },
                    display: { xs: 'none', sm: 'inline-flex' },
                    transition: theme.transitions.create([
                      'transform',
                      'background-color',
                      'border-color',
                    ]),
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      bgcolor: 'surfaceMuted',
                      borderColor: 'primary.dark',
                    },
                    '&:active': { transform: 'scale(0.98)' },
                  })}
                >
                  {t('shell.join')}
                </ButtonLink>
              </>
            ) : null}
          </Toolbar>
        </Container>
      </AppBar>

      {hasNav ? (
        <Drawer
          id="mobile-navigation"
          open={drawerOpen}
          onClose={closeDrawer}
          sx={{
            display: { md: 'none' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              borderRight: 1,
              borderColor: 'divider',
              boxShadow: '12px 0 32px rgba(13, 36, 25, 0.12)',
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <BrandLogo variant="full" height={32} />
          </Box>
          <Box sx={{ mx: 2, mb: 1 }}>
            <HeaderSearch onSubmitted={closeDrawer} />
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
                      mx: 1,
                      border: 1,
                      borderColor: 'transparent',
                      borderRadius: 0,
                      '&[data-status="active"]': {
                        color: 'primary.main',
                        bgcolor: 'surfaceMuted',
                        borderColor: 'primary.main',
                      },
                      '&[data-status="active"] .MuiListItemIcon-root': { color: 'primary.main' },
                      transition: (theme) =>
                        theme.transitions.create(['transform', 'background-color', 'color'], {
                          duration: theme.transitions.duration.short,
                        }),
                      '&:hover': {
                        transform: 'translateX(2px)',
                        bgcolor: 'surfaceMuted',
                        borderColor: 'divider',
                      },
                      '&:active': { transform: 'translateX(1px)' },
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
      ) : null}
    </>
  );
}

function HeaderLink({ item }: { item: NavItem }) {
  const { t } = useTranslation('common');
  return (
    <ButtonLink
      to={item.to}
      color="inherit"
      variant="outlined"
      sx={(theme) => ({
        color: 'text.primary',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        position: 'relative',
        borderRadius: 0,
        borderColor: 'divider',
        minHeight: 40,
        px: { md: 1, lg: 1.25 },
        transition: theme.transitions.create(
          ['transform', 'color', 'background-color', 'border-color'],
          { duration: theme.transitions.duration.short },
        ),
        '&:hover': {
          transform: 'translateY(-1px)',
          bgcolor: 'surfaceMuted',
          borderColor: 'primary.main',
        },
        '&:active': { transform: 'translateY(0) scale(0.98)' },
        '&[data-status="active"]': {
          color: 'primary.main',
          bgcolor: 'surfaceMuted',
          borderColor: 'primary.main',
        },
      })}
    >
      {t(item.labelKey)}
    </ButtonLink>
  );
}

const FOOTER_LINKS = [
  { to: '/about', labelKey: 'footer.about' },
  { to: '/help', labelKey: 'footer.help' },
  { to: '/privacy', labelKey: 'footer.privacy' },
  { to: '/terms', labelKey: 'footer.terms' },
] as const;

/** Dark band with the company name and the About · Help · Privacy · Terms links. */
function AppFooter() {
  const { t } = useTranslation('common');
  const { t: tSite } = useTranslation('site');
  return (
    <Box
      component="footer"
      sx={(theme) => ({
        bgcolor: 'inverse.bg',
        color: 'inverse.fgMuted',
        py: { xs: 3, sm: 4 },
        // The primary-colored focus ring would vanish on the dark band.
        '& a:focus-visible': { outlineColor: (theme.vars ?? theme).palette.inverse.fg },
      })}
    >
      <Container
        maxWidth="lg"
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography variant="body2">{t('footer.copyright')}</Typography>
        <Box component="nav" aria-label={tSite('footer.label')}>
          <Box
            component="ul"
            sx={{ display: 'flex', flexWrap: 'wrap', listStyle: 'none', m: 0, p: 0, gap: 0.5 }}
          >
            {FOOTER_LINKS.map((link, index) => (
              <Box component="li" key={link.to} sx={{ display: 'flex', alignItems: 'center' }}>
                {index > 0 ? (
                  <Box component="span" aria-hidden sx={{ mr: 0.5 }}>
                    ·
                  </Box>
                ) : null}
                <RouterLink
                  to={link.to}
                  variant="body2"
                  underline="hover"
                  sx={{
                    color: 'inherit',
                    borderRadius: 0.5,
                    // 24px tall targets (WCAG 2.5.8) without changing the line's look.
                    display: 'inline-block',
                    py: 0.25,
                    '&:hover, &[data-status="active"]': { color: 'inverse.fg' },
                  }}
                >
                  {tSite(link.labelKey)}
                </RouterLink>
              </Box>
            ))}
          </Box>
        </Box>
      </Container>
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
