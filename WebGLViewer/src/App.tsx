import * as React from 'react';
import { useEffect } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { useTheme, ThemeProvider, createTheme } from '@mui/material/styles';
import { useAppSelector, useAppDispatch } from '../app/hooks';

// @ts-ignore
import COLORS from './styles/variables';
import './styles/App.scss';
import { Routes, Route } from 'react-router-dom';

import Header from './components/coreapp/Header';
import Dashboard from './pages/Dashboard';
// import Settings from './pages/Settings';

import { PaletteMode } from '@mui/material';

const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    primary: {
      main: COLORS.colorPrimary,
    },
    secondary: {
      main: COLORS.colorSecondary,
    },
    // background: {
    //   default: 'rgb(18, 18, 18)',
    //   paper: 'rgb(18, 18, 18)',
    // },
    text: {
      ...(mode === 'light'
        ? {
            primary: '#000000',
            secondary: '#333',
          }
        : {
            primary: 'rgb(255, 255, 255)',
            secondary: '#999',
          }),
    },
    error: {
      main: '#ff5252',
    },
  },
  typography: {
    fontFamily: [
      'Source Sans Pro',
      'serif',
    ].join(','),
  },
  components: {
    MuiCard: {
      styleOverrides: {
        // Name of the slot
        root: {
          backgroundColor: '#ffffff',
          backgroundImage: 'none',
          boxShadow: 'none',
        },
      },
    },
  },
  transitions: {
    duration: {
      enteringScreen: 400,
      leavingScreen: 400,
    },
  },
});

function App() {
  const theme = useTheme();

  theme.typography.h1 = {
    fontFamily: [
      'Montserrat',
      'serif',
    ].join(','),
    fontSize: '1rem',
  };

  theme.typography.h2 = {
    fontFamily: [
      'Montserrat',
      'serif',
    ].join(','),
    fontSize: '1.5rem',
  };

  theme.typography.h3 = {
    fontFamily: [
      'Montserrat',
      'serif',
    ].join(','),
    fontSize: '1.25rem',
  };

  theme.typography.h4 = {
    fontFamily: [
      'Montserrat',
      'serif',
    ].join(','),
    fontSize: '1rem',
  };

  theme.typography.h5 = {
    fontFamily: [
      'Montserrat',
      'serif',
    ].join(','),
    fontSize: '1rem',
  };

  theme.typography.h6 = {
    fontFamily: [
      'Montserrat',
      'serif',
    ].join(','),
    fontSize: '1rem',
  };

  return (
    <div className="App">
      <CssBaseline>
        <Header>
          <main>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              {/* <Route path="/settings" element={<Settings />} /> */}
            </Routes>
          </main>
        </Header>
      </CssBaseline>
    </div>
  );
}

const lightModeTheme = createTheme(getDesignTokens('light'));

export default function LightThemeWithCustomPalette() {
  return (
    <ThemeProvider theme={lightModeTheme}>
      <App />
    </ThemeProvider>
  );
}
