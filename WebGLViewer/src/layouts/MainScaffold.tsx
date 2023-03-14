// React
import * as React from 'react';

// Hooks
import { useAppSelector, useAppDispatch } from '../../app/hooks/reduxTypescriptHooks';

// Import packages
import classNames from 'classnames';

// Import Redux actions
import { appStateActions } from '../../app/store/index';

// MUI Styles
import { styled, useTheme } from '@mui/material/styles';

// MUI Components
import {
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  Toolbar,
  Typography
} from '@mui/material';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';

import Paper from '@mui/material/Paper';

// MUI Icons
import MenuIcon from '@mui/icons-material/Menu';

// Custom Components
import Header from '../components/coreapp/Header';
import DrawerLeft from '../components/coreapp/DrawerLeft';
import DrawerRight from '../components/coreapp/DrawerRight';

// Styles
// @ts-ignore
import COLORS from '../../styles/variables';

export default function MainScaffold(props: any) {
  const { children } = props;

  const theme = useTheme();
  const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  return (
    <Box sx={{ display: 'flex' }}>
      <Header />
      <Box
        sx={{ flexGrow: 1, marginTop: '64px', padding: '0px', zIndex: '0' }}
        className={classNames(
          'main-container-sizing',
          {
            'main-container-sizing-with-drawer': openDrawerLeftState === true,
          },
        )}
      >
        <DrawerLeft />
        {children}
        <DrawerRight/>
      </Box>
    </Box>
  );
}
