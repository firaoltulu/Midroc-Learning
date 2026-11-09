import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f766e',
      dark: '#115e59',
      light: '#ccfbf1',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#c2410c',
      contrastText: '#ffffff'
    },
    background: {
      default: '#f4f8f7',
      paper: '#ffffff'
    },
    text: {
      primary: '#173b38',
      secondary: '#526b68'
    },
    divider: '#dce8e5'
  },
  shape: {
    borderRadius: 16
  },
  typography: {
    fontFamily: 'Inter, "Noto Sans Ethiopic", Arial, sans-serif',
    button: {
      fontWeight: 600,
      textTransform: 'none'
    },
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.04em'
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.03em'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 12
        }
      }
    },
    MuiCssBaseline: {
      styleOverrides: {
        ':focus-visible': {
          outline: '3px solid #0f766e',
          outlineOffset: 3
        },
        '::selection': {
          backgroundColor: '#99f6e4'
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            scrollBehavior: 'auto !important',
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important'
          }
        }
      }
    }
  }
});
