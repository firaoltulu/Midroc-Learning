/**
 * theme.ts — minimalistic light + dark theme for MUI v6/v7, derived from the
 * Midroc logo colors (measured from the PNG):
 *   deep green #135339 (wordmark + mark)   bright green #5AA142
 *   gold #CA942F                           brown #47300D
 *
 * Principles: one accent (green), gold used sparingly, thin borders instead of
 * shadows, soft 10px radius, no uppercase, no italics, calm motion.
 * Every text/background pair below was checked against WCAG AA (4.5:1 text,
 * 3:1 for input borders and graphics).
 *
 * Usage:
 *   <ThemeProvider theme={theme} defaultMode="system"><CssBaseline enableColorScheme />…
 *   Switch with useColorScheme().setMode('light' | 'dark' | 'system').
 *   Set <html lang="am"> when the UI language is Amharic: the theme then enlarges
 *   the base font and line height for the Ethiopic script.
 *
 * Fonts: install @fontsource-variable/inter and @fontsource/noto-sans-ethiopic;
 * import the Ethiopic one only when the language is Amharic (dynamic import).
 */
import { createTheme, type Components, type Theme } from '@mui/material/styles';

// ---------- custom palette tokens (typed) ----------
declare module '@mui/material/styles' {
  interface Tone {
    fg: string; // text/icon color
    bg: string; // soft tinted background
  }
  interface Palette {
    status: Record<'draft' | 'pending' | 'published' | 'rejected' | 'archived', Tone>;
    diff: Record<'added' | 'removed' | 'changed', Tone>;
    brand: { deepGreen: string; green: string; gold: string; brown: string };
    inputBorder: string;
    surfaceMuted: string;
    /** Full-width brand band (home and course hero, sign-in panel). */
    hero: { bg: string; fg: string; fgMuted: string };
    /** Dark band at the bottom of the page (footer), in both schemes. */
    inverse: { bg: string; fg: string; fgMuted: string };
    /** Rating stars: `main` on page and paper surfaces, `onHero` on the hero band (both >= 3:1). */
    rating: { main: string; onHero: string };
  }
  interface PaletteOptions {
    status?: Palette['status'];
    diff?: Palette['diff'];
    brand?: Palette['brand'];
    inputBorder?: string;
    surfaceMuted?: string;
    hero?: Palette['hero'];
    inverse?: Palette['inverse'];
    rating?: Palette['rating'];
  }
}

const brand = { deepGreen: '#135339', green: '#5AA142', gold: '#CA942F', brown: '#47300D' };

const FONT_STACK =
  '"Inter Variable", "Inter", "Noto Sans Ethiopic", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' }, // [data-mui-color-scheme="dark"]
  defaultColorScheme: 'light',
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#135339', dark: '#0E412C', light: '#2F6F55', contrastText: '#FFFFFF' },
        // gold = sparing accent. contrastText gives 6:1 on the gold fill.
        secondary: { main: '#CA942F', dark: '#A97A12', light: '#FAF1DE', contrastText: '#2B1D06' },
        success: { main: '#2E7D4F' },
        warning: { main: '#8A5A00' },
        error: { main: '#A12D2D' },
        info: { main: '#2C5F8A' },
        background: { default: '#F7F8F6', paper: '#FFFFFF' },
        text: { primary: '#17211C', secondary: '#55635B', disabled: '#8A958F' },
        divider: '#E2E7E3',
        inputBorder: '#7A8780', // 3.75:1 on white
        surfaceMuted: '#EFF2EF',
        // fg 9.0:1, fgMuted 7.2:1 on the band.
        hero: { bg: '#135339', fg: '#FFFFFF', fgMuted: '#DCE9E0' },
        // fg 15.8:1, fgMuted 9.4:1 on the band.
        inverse: { bg: '#0E1311', fg: '#E7EDE9', fgMuted: '#AEBBB4' },
        // 3.8:1 on white; the brand gold on the band (3.4:1).
        rating: { main: '#A97A12', onHero: '#CA942F' },
        brand,
        status: {
          draft: { fg: '#4A5560', bg: '#EEF0F1' },
          pending: { fg: '#7A5200', bg: '#FBF1DC' },
          published: { fg: '#135339', bg: '#E3F1E8' },
          rejected: { fg: '#A12D2D', bg: '#FBEAEA' },
          archived: { fg: '#4A5560', bg: '#EEF0F1' },
        },
        diff: {
          added: { fg: '#14532D', bg: '#E3F5E8' },
          removed: { fg: '#8E2323', bg: '#FBE6E6' },
          changed: { fg: '#7A5200', bg: '#FBF1DC' },
        },
      },
    },
    dark: {
      palette: {
        primary: { main: '#5AA142', dark: '#478A33', light: '#6DB654', contrastText: '#0A1A0C' },
        secondary: { main: '#CA942F', dark: '#A97A12', light: '#2C2410', contrastText: '#2B1D06' },
        success: { main: '#6DB654' },
        warning: { main: '#E3B55A' },
        error: { main: '#F0A0A0' },
        info: { main: '#8DB8E0' },
        background: { default: '#0E1311', paper: '#151B18' },
        text: { primary: '#E7EDE9', secondary: '#9FADA6', disabled: '#66726C' },
        divider: '#29322E',
        inputBorder: '#6B7872', // 3.79:1 on the paper color
        surfaceMuted: '#1C2320',
        // A darker brand green so the band doesn't glare in the dark scheme (fg 10.3:1, muted 7.8:1).
        hero: { bg: '#103D2B', fg: '#E7EDE9', fgMuted: '#C2D3C9' },
        inverse: { bg: '#090C0B', fg: '#E7EDE9', fgMuted: '#9FADA6' },
        // 9.2:1 on the paper color, 6.4:1 on the band.
        rating: { main: '#E3B55A', onHero: '#E3B55A' },
        brand,
        status: {
          draft: { fg: '#B6C1BB', bg: '#222A27' },
          pending: { fg: '#E3B55A', bg: '#2C2410' },
          published: { fg: '#8FD07A', bg: '#1B2B1F' },
          rejected: { fg: '#F0A0A0', bg: '#2E1717' },
          archived: { fg: '#B6C1BB', bg: '#222A27' },
        },
        diff: {
          added: { fg: '#8FD07A', bg: '#1B2B1F' },
          removed: { fg: '#F0A0A0', bg: '#2E1717' },
          changed: { fg: '#E3B55A', bg: '#2C2410' },
        },
      },
    },
  },

  spacing: 8,
  shape: { borderRadius: 10 },

  typography: {
    fontFamily: FONT_STACK,
    fontSize: 14,
    htmlFontSize: 16,
    // No uppercase, no letter-spacing, no italics: none of it works for Ethiopic.
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    h1: { fontSize: '2.25rem', fontWeight: 650, lineHeight: 1.2 },
    h2: { fontSize: '1.75rem', fontWeight: 650, lineHeight: 1.25 },
    h3: { fontSize: '1.375rem', fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
    h5: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 },
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.55 },
    caption: { fontSize: '0.8125rem', lineHeight: 1.5 },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: (theme: Theme) => ({
        // Amharic: slightly larger base size (all rem sizes scale) and looser lines
        "html[lang='am']": { fontSize: '106.25%' },
        "html[lang='am'] .MuiTypography-root, html[lang='am'] .MuiButton-root": { lineHeight: 1.7 },
        'a, button, [role="button"], input, select, textarea, [tabindex]': {
          '&:focus-visible': {
            outline: `2px solid ${(theme.vars ?? theme).palette.primary.main}`,
            outlineOffset: 2,
          },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      }),
    },
    MuiButtonBase: { defaultProps: { disableRipple: true } }, // calmer than ripples
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10, minHeight: 40 }, sizeLarge: { minHeight: 48 } },
    },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } }, // touch target
    // Separate surfaces with a thin border, never a shadow. Remove MUI's dark-mode
    // elevation overlay so dark surfaces stay flat.
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 14 } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: (theme.vars ?? theme).palette.background.paper,
          borderBottom: `1px solid ${(theme.vars ?? theme).palette.divider}`,
        }),
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: (theme.vars ?? theme).palette.inputBorder, // 3:1 against the surface
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: (theme.vars ?? theme).palette.text.secondary,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
            borderColor: (theme.vars ?? theme).palette.primary.main,
          },
        }),
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
    MuiTooltip: { styleOverrides: { tooltip: { fontSize: '0.8125rem' } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 99, height: 6 } } },
  } satisfies Components<Theme>,
});

export default theme;
