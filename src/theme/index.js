import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    background: { default: '#EEF2F7', paper: '#FFFFFF' },
    primary:  { main: '#1E88E5' },
    error:    { main: '#EF4444' },
    warning:  { main: '#EFA23B' },
    success:  { main: '#059669' },
    text: {
      primary:   '#111827',
      secondary: '#6B7280',
      disabled:  '#9CA3AF',
    },
  },
  typography: {
    fontFamily: '"Space Grotesk", ui-sans-serif, sans-serif',
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        'html, body, #root': { background: '#EEF2F7', color: '#111827', minHeight: '100vh' },
      },
    },
    MuiAppBar:  { styleOverrides: { root: { backgroundImage: 'none', backgroundColor: '#FFFFFF' } } },
    MuiCard:    { styleOverrides: { root: { backgroundImage: 'none', backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' } } },
    MuiDivider: { styleOverrides: { root: { borderColor: '#E5E7EB' } } },
    MuiMenu:    { styleOverrides: { paper: { border: '1px solid #E5E7EB' } } },
  },
});

export default theme;