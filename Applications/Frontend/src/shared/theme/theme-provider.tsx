import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { theme } from './theme';

/** localStorage key holding the user's choice: 'system' | 'light' | 'dark'. */
export const COLOR_MODE_STORAGE_KEY = 'midroc.color-mode';

/**
 * Light/dark theme following the system setting by default, with a persisted manual choice
 * (MUI's color-scheme manager stores the mode under COLOR_MODE_STORAGE_KEY).
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      theme={theme}
      defaultMode="system"
      modeStorageKey={COLOR_MODE_STORAGE_KEY}
      disableTransitionOnChange
    >
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
