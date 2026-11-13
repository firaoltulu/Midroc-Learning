import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useNavigate } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '../api/me';
import { useSignOut } from './auth-context';

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  return Array.from(source)[0]?.toUpperCase() ?? '?';
}

/** Avatar button with the signed-in user's name, account and admin links, and sign-out. */
export function UserMenu() {
  const { t } = useTranslation('auth');
  const { data: me } = useMe();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  if (!me) return null;

  const close = () => {
    setAnchor(null);
  };
  const displayName = me.name?.trim() || me.email;

  return (
    <>
      <IconButton
        aria-label={t('userMenu.label', { name: displayName })}
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            fontSize: '0.875rem',
            fontWeight: 600,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          {initials(me.name, me.email)}
        </Avatar>
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1, maxWidth: 280 }}>
          <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{displayName}</Typography>
          {me.name ? (
            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
              {me.email}
            </Typography>
          ) : null}
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            void navigate({ to: '/account' });
          }}
        >
          <ListItemIcon>
            <PersonOutlineOutlined />
          </ListItemIcon>
          <ListItemText>{t('userMenu.account')}</ListItemText>
        </MenuItem>
        {me.role === 'admin' ? (
          <MenuItem
            onClick={() => {
              close();
              void navigate({ to: '/admin' });
            }}
          >
            <ListItemIcon>
              <AdminPanelSettingsOutlined />
            </ListItemIcon>
            <ListItemText>{t('userMenu.admin')}</ListItemText>
          </MenuItem>
        ) : null}
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            void signOut();
          }}
        >
          <ListItemIcon>
            <LogoutOutlined />
          </ListItemIcon>
          <ListItemText>{t('userMenu.signOut')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
