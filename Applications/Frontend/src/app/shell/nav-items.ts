import HomeOutlined from '@mui/icons-material/HomeOutlined';
import PaletteOutlined from '@mui/icons-material/PaletteOutlined';
import type { ParseKeys } from 'i18next';
import type { ComponentType } from 'react';

export interface NavItem {
  to: '/' | '/design';
  labelKey: ParseKeys;
  Icon: ComponentType;
}

/**
 * Primary navigation. Catalog, learning, my courses and admin entries are added with their
 * routes in later phases (typed `to` keeps links and routes in sync). /design is temporary.
 */
export const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.home', Icon: HomeOutlined },
  { to: '/design', labelKey: 'nav.design', Icon: PaletteOutlined },
];
