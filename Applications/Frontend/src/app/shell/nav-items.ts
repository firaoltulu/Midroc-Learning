import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import ExploreOutlined from '@mui/icons-material/ExploreOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import type { ParseKeys } from 'i18next';
import type { ComponentType } from 'react';

/** Who sees the entry: everyone, signed-in (verified) users, or administrators (per /me). */
export type NavAccess = 'public' | 'signedIn' | 'admin';

export interface NavItem {
  to: '/courses' | '/learn' | '/my-courses' | '/admin';
  labelKey: ParseKeys;
  Icon: ComponentType;
  access: NavAccess;
}

/**
 * Primary navigation (typed `to` keeps links and routes in sync). The first entry (Explore) is
 * drawn as an outlined button next to the logo, the rest as text links after the search box.
 */
export const navItems: NavItem[] = [
  { to: '/courses', labelKey: 'nav.explore', Icon: ExploreOutlined, access: 'signedIn' },
  { to: '/learn', labelKey: 'nav.learning', Icon: SchoolOutlined, access: 'signedIn' },
  { to: '/my-courses', labelKey: 'nav.myCourses', Icon: EditNoteOutlined, access: 'signedIn' },
  { to: '/admin', labelKey: 'nav.admin', Icon: AdminPanelSettingsOutlined, access: 'admin' },
];

export function visibleNavItems(signedIn: boolean, isAdmin: boolean): NavItem[] {
  return navItems.filter(
    (item) =>
      item.access === 'public' ||
      (item.access === 'signedIn' && signedIn) ||
      (item.access === 'admin' && isAdmin),
  );
}
