// React
import * as React from 'react';

// Hooks
import { useAppSelector } from '../../app/hooks/reduxTypescriptHooks';

// Import packages
import classNames from 'classnames';

// MUI Components
import {
  Box,
} from '@mui/material';

// Custom Components
import WebGL from '../components/display/WebGL/WebGL';

function LayoutDashboard() {

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  return (
    <Box sx={{ position: 'absolute', right: 0}} className={classNames(
      'main-container-sizing',
      {
        'main-container-sizing-with-list-drawer': openDrawerLeftWidth === 430,
        'main-container-sizing-with-info-drawer': openDrawerLeftWidth === 800,
      },
    )}>
      <WebGL></WebGL>
    </Box>
    
  );
}

export default LayoutDashboard;
