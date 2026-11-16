import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useColorScheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type ColorMode = 'system' | 'light' | 'dark';

const modes: ColorMode[] = ['system', 'light', 'dark'];

/** Icon button with a menu: Match device / Light / Dark. The choice is persisted by MUI. */
export function ThemeModeSwitch() {
  const { t } = useTranslation('common');
  const { mode, setMode } = useColorScheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const current: ColorMode = mode ?? 'system';
  const label = t('theme.menuLabel', { mode: t(`theme.${current}`) });

  return (
    <>
      <Tooltip title={label}>
        <Button
          aria-label={label}
          color="inherit"
          variant="outlined"
          aria-haspopup="menu"
          aria-controls={anchor ? menuId : undefined}
          aria-expanded={anchor ? 'true' : undefined}
          onClick={(event) => {
            setAnchor(event.currentTarget);
          }}
          sx={(theme) => ({
            minWidth: 56,
            minHeight: 44,
            px: 1.25,
            border: 1,
            borderColor: 'divider',
            borderRadius: 0,
            color: 'text.primary',
            transition: theme.transitions.create(['transform', 'background-color', 'border-color']),
            '&:hover': {
              bgcolor: 'surfaceMuted',
              borderColor: 'primary.main',
              transform: 'translateY(-1px)',
            },
            '&:active': { transform: 'scale(0.96)' },
          })}
        >
          {t('theme.buttonLabel')}
        </Button>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={Boolean(anchor)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        onClose={() => {
          setAnchor(null);
        }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 232,
              mt: 1,
              p: 0.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: '6px',
              bgcolor: 'background.paper',
              boxShadow: '0 12px 28px rgba(13, 36, 25, 0.14)',
              '& .MuiMenu-list': { p: 0 },
            },
          },
        }}
      >
        <Box
          component="li"
          role="presentation"
          sx={{ px: 1.5, pt: 1, pb: 1, borderBottom: 1, borderColor: 'divider', mb: 0.5 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {t('theme.menuTitle')}
          </Typography>
        </Box>
        {modes.map((option) => (
          <MenuItem
            key={option}
            role="menuitemradio"
            aria-checked={current === option}
            selected={current === option}
            onClick={() => {
              setMode(option);
              setAnchor(null);
            }}
            sx={{
              mx: 0.25,
              my: 0.25,
              minHeight: 44,
              border: 1,
              borderColor: 'transparent',
              borderRadius: 0,
              transition: (theme) =>
                theme.transitions.create(['background-color', 'border-color', 'color']),
              '&:hover': { bgcolor: 'surfaceMuted' },
              '&.Mui-selected': {
                bgcolor: 'surfaceMuted',
                color: 'primary.main',
                fontWeight: 600,
                borderColor: 'primary.main',
              },
              '&.Mui-selected:hover': { bgcolor: 'surfaceMuted', borderColor: 'primary.main' },
            }}
          >
            <ListItemText>{t(`theme.${option}`)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
