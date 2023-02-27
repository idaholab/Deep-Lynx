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
import SideBarLeft from '../components/coreapp/SideBarLeft';
import SideBarRight from '../components/coreapp/SideBarRight';

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
      <SideBarLeft />
      <Box
        sx={{ flexGrow: 1, marginTop: '64px', padding: '0px', zIndex: '0' }}
        className={classNames(
          'main-container-sizing',
          {
            'main-container-sizing-with-drawer': openDrawerLeftState === true,
          },
        )}
      >
        {children}
        <SideBarRight/>
      </Box>
    </Box>
  );
}
