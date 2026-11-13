import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import PaletteOutlined from '@mui/icons-material/PaletteOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import type { ParseKeys } from 'i18next';
import type { ComponentType } from 'react';

/** Who sees the entry: everyone, signed-in (verified) users, or administrators (per /me). */
export type NavAccess = 'public' | 'signedIn' | 'admin';

export interface NavItem {
  to: '/courses' | '/learn' | '/my-courses' | '/design' | '/admin';
  labelKey: ParseKeys;
  Icon: ComponentType;
  access: NavAccess;
}

/** Primary navigation (typed `to` keeps links and routes in sync). /design is temporary. */
export const navItems: NavItem[] = [
  { to: '/courses', labelKey: 'nav.courses', Icon: MenuBookOutlined, access: 'signedIn' },
  { to: '/learn', labelKey: 'nav.learning', Icon: SchoolOutlined, access: 'signedIn' },
  { to: '/my-courses', labelKey: 'nav.myCourses', Icon: EditNoteOutlined, access: 'signedIn' },
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
