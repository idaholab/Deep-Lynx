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

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${useAppSelector((state: any) => state.appState.openDrawerLeftWidth)}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

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
  ...(open && {
    width: `calc(100% - ${useAppSelector((state: any) => state.appState.openDrawerLeftWidth)}px)`,
    marginLeft: `${useAppSelector((state: any) => state.appState.openDrawerLeftWidth)}px`,
    transition: theme.transitions.create(['margin-left', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

export default function Header(props: any) {
  const { children } = props;

  const theme = useTheme();
  const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);
  const handleToggleOpenDrawerLeft = () => {
    dispatch(appStateActions.toggleDrawerLeft());
  };

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
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleToggleOpenDrawerLeft}
              edge="start"
              sx={{ mr: 2, }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              WebGL Viewer
            </Typography>
          </Toolbar>
        </AppBar>
      </Box>
    </>
  );
}
