import Check from '@mui/icons-material/CheckOutlined';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlined from '@mui/icons-material/SettingsBrightnessOutlined';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useColorScheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import { useId, useState, type ComponentType } from 'react';
import { useTranslation } from '../i18n/translate';

export type ColorMode = 'system' | 'light' | 'dark';

const modes: { mode: ColorMode; Icon: ComponentType }[] = [
  { mode: 'system', Icon: SettingsBrightnessOutlined },
  { mode: 'light', Icon: LightModeOutlined },
  { mode: 'dark', Icon: DarkModeOutlined },
];

/** Icon button with a menu: Match device / Light / Dark. The choice is persisted by MUI. */
export function ThemeModeSwitch() {
  const { t } = useTranslation('common');
  const { mode, setMode } = useColorScheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const current: ColorMode = mode ?? 'system';
  const CurrentIcon =
    modes.find((entry) => entry.mode === current)?.Icon ?? SettingsBrightnessOutlined;
  const label = t('theme.menuLabel', { mode: t(`theme.${current}`) });

  return (
    <>
      <Tooltip title={label}>
        <IconButton
          aria-label={label}
          aria-haspopup="menu"
          aria-controls={anchor ? menuId : undefined}
          aria-expanded={anchor ? 'true' : undefined}
          onClick={(event) => {
            setAnchor(event.currentTarget);
          }}
        >
          <CurrentIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => {
          setAnchor(null);
        }}
      >
        {modes.map(({ mode: option, Icon }) => (
          <MenuItem
            key={option}
            role="menuitemradio"
            aria-checked={current === option}
            selected={current === option}
            onClick={() => {
              setMode(option);
              setAnchor(null);
            }}
          >
            <ListItemIcon>
              <Icon />
            </ListItemIcon>
            <ListItemText>{t(`theme.${option}`)}</ListItemText>
            {current === option ? <Check fontSize="small" sx={{ ml: 2 }} aria-hidden /> : null}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
