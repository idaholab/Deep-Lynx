import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import CssBaseline from '@mui/material/CssBaseline';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Paper from '@mui/material/Paper';

import SideBarLeft from './SideBarLeft';
import SideBarRight from './SideBarRight';
// @ts-ignore
import COLORS from '../../styles/variables';

const drawerWidth = 365;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
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
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));


const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

export default function Header(props: any) {
  const { children } = props;

  const theme = useTheme();
  const [openLeft, setOpenLeft] = React.useState(true);
  const [openRight, setOpenRight] = React.useState(false);

  const handleDrawerOpenLeftState = () => {
    setOpenLeft(state => !state);
  };

  const handleDrawerOpenRightState = () => {
    setOpenRight(state => !state);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Box sx={{ width: '100%', height: '64px', position: 'fixed', backgroundColor: COLORS.colorSecondary, zIndex: 1 }}>
        <Paper square={true} elevation={3} sx={{ width: '100%', height: '64px', backgroundColor: COLORS.colorSecondary }} ></Paper>
      </Box>
      <Box>
        <AppBar position="fixed" elevation={0} open={openLeft} color={"secondary"}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerOpenLeftState}
              edge="start"
              sx={{ mr: 2, }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              WebGL Viewer
            </Typography>
            <a
              aria-label="open drawer"
              onClick={handleDrawerOpenRightState}
              style={{
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
            >
              Temp Right Drawer Trigger
            </a>
          </Toolbar>
        </AppBar>
      </Box>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: COLORS.colorLightgray,
          },
        }}
        variant="persistent"
        anchor="left"
        open={openLeft}
      >
        
        <Paper square={true} elevation={3} sx={{ width: '102%', height: '64px', backgroundColor: COLORS.colorSecondary, }}>
          <Toolbar sx={{ padding: 0 }}>
            <img alt="Deep Lynx Logo" width="100" src="/assets/lynx-white.png" style={{ marginLeft: '-8px' }} />
          </Toolbar>
        </Paper>
    
        <SideBarLeft />
      </Drawer>
      <Main open={openLeft} sx={{ flexGrow: 1, marginTop: '64px', zIndex: '0' }}>
        {children}
        <Drawer
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              marginTop: '64px',
            },
          }}
          variant="persistent"
          anchor="right"
          open={openRight}
        >
          <SideBarRight/>
        </Drawer>
      </Main>
    </Box>
  );
}