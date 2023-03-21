// React
import * as React from 'react';

// Hooks
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Import packages
import classNames from 'classnames';

// Import Redux actions
import { appStateActions } from '../../../app/store/index';

// MUI Styles
import { styled, useTheme } from '@mui/material/styles';

// MUI Components
import {
  Box,
  IconButton,
  Paper,
  Toolbar,
  Typography
} from '@mui/material';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';

// MUI Icons
import MenuIcon from '@mui/icons-material/Menu';

// Styles
// @ts-ignore
import COLORS from '../../styles/variables';

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
  transition: theme.transitions.create(['margin-left', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
}));

export default function Header(props: any) {
  const { children } = props;

  const theme = useTheme();
  const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  type openDrawerRightState = boolean;
  const openDrawerRightState: openDrawerRightState = useAppSelector((state: any) => state.appState.openDrawerRight);

  return (
    <>
      <Box sx={{ width: '100%', height: '64px', position: 'fixed', backgroundColor: COLORS.colorSecondary, zIndex: 1 }}>
        <Paper square={true} elevation={3} sx={{ width: '100%', height: '64px', backgroundColor: COLORS.colorSecondary }} ></Paper>
      </Box>
      <Box>
        <AppBar position="fixed" elevation={0} open={openDrawerLeftState} color={"secondary"}>
          <Toolbar>
            <img alt="Deep Lynx Logo" width="100" src="/assets/lynx-white.png" style={{ marginLeft: '-8px', marginRight: '20px' }} />
            <Typography variant="h6" noWrap component="div">
              WebGL Viewer
            </Typography>
          </Toolbar>
        </AppBar>
      </Box>
    </>
  );
}
