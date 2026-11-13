export const EDITOR_TABS = ['details', 'content', 'review'] as const;

/** The editor's tabs; the route keeps the open one in `?tab=` (default: details). */
export type EditorTab = (typeof EDITOR_TABS)[number];
