import { useMatches } from '@tanstack/react-router';

/**
 * How the app shell frames a route (set with `staticData: { layout }` on the route):
 * - `page` (default): header, footer, and the content in a centered container with padding.
 * - `fullBleed`: header and footer; the screen lays out its own full-width bands
 *   (hero sections) and containers.
 * - `focus`: no header or footer; the screen brings its own slim top bar (player, exam,
 *   sign-in). The skip link and the main landmark stay.
 */
export type ShellLayout = 'page' | 'fullBleed' | 'focus';

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    layout?: ShellLayout;
  }
}

/** The layout of the deepest matched route that sets one. */
export function useShellLayout(): ShellLayout {
  const matches = useMatches();
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const layout = matches[index]?.staticData.layout;
    if (layout) return layout;
  }
  return 'page';
}
