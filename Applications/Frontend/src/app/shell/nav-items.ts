import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import PaletteOutlined from '@mui/icons-material/PaletteOutlined';
import type { ParseKeys } from 'i18next';
import type { ComponentType } from 'react';

/** Who sees the entry: everyone, signed-in (verified) users, or administrators (per /me). */
export type NavAccess = 'public' | 'signedIn' | 'admin';

export interface NavItem {
  to: '/' | '/design' | '/admin';
  labelKey: ParseKeys;
  Icon: ComponentType;
  access: NavAccess;
}

/**
 * Primary navigation. Catalog, learning and my-courses entries are added with their routes
 * in later phases (typed `to` keeps links and routes in sync). /design is temporary.
 */
export const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.home', Icon: HomeOutlined, access: 'signedIn' },
  { to: '/admin', labelKey: 'nav.admin', Icon: AdminPanelSettingsOutlined, access: 'admin' },
  { to: '/design', labelKey: 'nav.design', Icon: PaletteOutlined, access: 'public' },
];

export function visibleNavItems(signedIn: boolean, isAdmin: boolean): NavItem[] {
  return navItems.filter(
    (item) =>
      item.access === 'public' ||
      (item.access === 'signedIn' && signedIn) ||
      (item.access === 'admin' && isAdmin),
  );
}
