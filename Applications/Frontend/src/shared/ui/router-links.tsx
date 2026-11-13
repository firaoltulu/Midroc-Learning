import Button, { type ButtonProps } from '@mui/material/Button';
import MuiLink, { type LinkProps as MuiLinkProps } from '@mui/material/Link';
import ListItemButton, { type ListItemButtonProps } from '@mui/material/ListItemButton';
import { createLink, type LinkComponent } from '@tanstack/react-router';
import { forwardRef } from 'react';

/*
 * MUI components wired to TanStack Router (typed `to`, preloading, active state).
 * The router marks the active link with `data-status="active"` and `aria-current="page"`.
 */

const MuiLinkAnchor = forwardRef<HTMLAnchorElement, MuiLinkProps>((props, ref) => (
  <MuiLink ref={ref} {...props} />
));
MuiLinkAnchor.displayName = 'MuiLinkAnchor';

const ButtonAnchor = forwardRef<HTMLAnchorElement, ButtonProps<'a'>>((props, ref) => (
  <Button ref={ref} component="a" {...props} />
));
ButtonAnchor.displayName = 'ButtonAnchor';

const ListItemButtonAnchor = forwardRef<HTMLAnchorElement, ListItemButtonProps<'a'>>(
  (props, ref) => <ListItemButton ref={ref} component="a" {...props} />,
);
ListItemButtonAnchor.displayName = 'ListItemButtonAnchor';

const CreatedLink = createLink(MuiLinkAnchor);
const CreatedButtonLink = createLink(ButtonAnchor);
const CreatedListItemLink = createLink(ListItemButtonAnchor);

export const RouterLink: LinkComponent<typeof MuiLinkAnchor> = (props) => (
  <CreatedLink preload="intent" {...props} />
);

export const ButtonLink: LinkComponent<typeof ButtonAnchor> = (props) => (
  <CreatedButtonLink preload="intent" {...props} />
);

export const ListItemLink: LinkComponent<typeof ListItemButtonAnchor> = (props) => (
  <CreatedListItemLink preload="intent" {...props} />
);
