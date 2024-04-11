// React
import * as React from 'react';

// MUI Components
import {
  AppBar,
  Box,
  Paper,
  Toolbar,
  Typography
} from '@mui/material';

// Styles
// @ts-ignore
import COLORS from '../../styles/variables';

export default function Header(props: any) {
  return (
    <>
      <Box sx={{ width: '100%', height: '64px', position: 'fixed', backgroundColor: COLORS.colorSecondary, zIndex: 1 }}>
        <Paper square={true} elevation={3} sx={{ width: '100%', height: '64px', backgroundColor: COLORS.colorSecondary }} ></Paper>
      </Box>
      <Box>
        <AppBar position="fixed" elevation={0} color={"secondary"}>
          <Toolbar>
            <img alt="DeepLynx Logo" width="100" src="assets/lynx-white.png" style={{ marginLeft: '-8px', marginRight: '20px' }} />
            <Typography variant="h6" noWrap component="div">
              DeepLynx 2D/3D Model Explorer
            </Typography>
          </Toolbar>
        </AppBar>
      </Box>
    </>
  );
}
