import { useColorScheme } from '@mui/material/styles';

export type ResolvedColorScheme = 'light' | 'dark';

/**
 * The color scheme actually on screen: the manual choice, or the system setting when the
 * mode is 'system'. Falls back to light until MUI has read the mode (first render).
 */
export function useResolvedColorScheme(): ResolvedColorScheme {
  const { mode, systemMode } = useColorScheme();
  const resolved = mode === 'system' ? systemMode : mode;
  return resolved === 'dark' ? 'dark' : 'light';
}
