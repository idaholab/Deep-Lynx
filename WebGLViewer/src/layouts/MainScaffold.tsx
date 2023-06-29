// React
import * as React from 'react';

// Hooks
import { useAppSelector, useAppDispatch } from '../../app/hooks/reduxTypescriptHooks';

// MUI Components
import {
  Box,
  Button,
} from '@mui/material';

// Custom Components
import Header from '../components/coreapp/Header';
import DrawerLeft from '../components/coreapp/DrawerLeft';
import DrawerRight from '../components/coreapp/DrawerRight';
import LayoutDashboard from '../layouts/LayoutDashboard';

export default function MainScaffold(props: any) {

  return (
    <Box sx={{ display: 'flex' }}>
      <Header />
      <Box
        sx={{ flexGrow: 1, marginTop: '64px', padding: '0px', zIndex: '0' }}
      >
        <DrawerLeft />
        <LayoutDashboard />
        <DrawerRight/>
      </Box>
    </Box>
  );
}
