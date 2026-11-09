import MenuIcon from '@mui/icons-material/Menu';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import CloseIcon from '@mui/icons-material/Close';
import {
  AppBar,
  Box,
  Container,
  Drawer,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar
} from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import { Link } from '@tanstack/react-router';
import { useState, type PropsWithChildren } from 'react';
import { BrandLogo } from '../brand/brand-logo';
import { LanguageSwitcher } from '../i18n/language-switcher';
import { useLanguage } from '../i18n/language-provider';

type ThemeMode = 'system' | 'light' | 'dark';
type NavigationTarget = '/' | '/design';

interface AppNavLinkProps {
  to: NavigationTarget;
  children: string;
  onClick?: () => void;
}

function AppNavLink({ to, children, onClick }: AppNavLinkProps) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === '/' }}
      className="app-shell-link"
      activeProps={{ className: 'app-shell-link app-shell-link--active' }}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const { mode, setMode } = useColorScheme();
  const { messages } = useLanguage();
  const [themeAnchor, setThemeAnchor] = useState<HTMLElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const selectedMode: ThemeMode = mode === 'light' || mode === 'dark' ? mode : 'system';
  const navigation = [
    { to: '/' as const, label: messages.homeNavigation },
    { to: '/design' as const, label: messages.designNavigation }
  ];
  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: messages.themeSystem },
    { value: 'light', label: messages.themeLight },
    { value: 'dark', label: messages.themeDark }
  ];

  function renderNavigation(mobile = false) {
    return navigation.map((item) => (
      <AppNavLink
        key={item.to}
        to={item.to}
        onClick={mobile ? () => setDrawerOpen(false) : undefined}
      >
        {item.label}
      </AppNavLink>
    ));
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', color: 'text.primary' }}>
      <Box
        component="a"
        className="skip-link"
        href="#main-content"
        sx={{ backgroundColor: 'background.paper', color: 'text.primary' }}
      >
        {messages.skipToContent}
      </Box>
      <AppBar position="static">
        <Toolbar disableGutters sx={{ minHeight: '72px !important' }}>
          <Container
            maxWidth="lg"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: { xs: 1, md: 3 }
            }}
          >
            <BrandLogo />
            <Box
              component="nav"
              aria-label={messages.navigationLabel}
              sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}
            >
              {renderNavigation()}
            </Box>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <LanguageSwitcher />
              <IconButton
                aria-label={messages.changeTheme}
                aria-haspopup="menu"
                aria-expanded={themeAnchor !== null}
                onClick={(event) => setThemeAnchor(event.currentTarget)}
              >
                <PaletteOutlinedIcon />
              </IconButton>
              <Menu
                anchorEl={themeAnchor}
                open={themeAnchor !== null}
                onClose={() => setThemeAnchor(null)}
                MenuListProps={{ 'aria-label': messages.changeTheme }}
              >
                {themeOptions.map((option) => (
                  <MenuItem
                    key={option.value}
                    selected={selectedMode === option.value}
                    onClick={() => {
                      setMode(option.value);
                      setThemeAnchor(null);
                    }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Menu>
              <IconButton
                aria-label={messages.openNavigation}
                onClick={() => setDrawerOpen(true)}
                sx={{ display: { xs: 'inline-flex', md: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
            </Stack>
          </Container>
        </Toolbar>
      </AppBar>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 'min(84vw, 320px)', p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <BrandLogo />
            <IconButton aria-label={messages.closeNavigation} onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          <Stack component="nav" aria-label={messages.navigationLabel} spacing={1}>
            {renderNavigation(true)}
          </Stack>
        </Box>
      </Drawer>

      <Box component="main" id="main-content" tabIndex={-1}>
        {children}
      </Box>
    </Box>
  );
}
