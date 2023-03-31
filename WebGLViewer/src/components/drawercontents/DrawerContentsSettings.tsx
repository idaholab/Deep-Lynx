// React
import * as React from 'react';

// Hooks
import { useAppSelector } from '../../../app/hooks/reduxTypescriptHooks';

// MUI Components
import {
  Box,
} from '@mui/material';

type Props = {};

const DrawerContentsSettings: React.FC<Props> = ({}) => {
  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', overflowX: 'hidden', }}
    >
      <Box sx={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: '0 16px 16px' }}>
        Settings go here
      </Box>
    </Box>
  );
}

export default DrawerContentsSettings;
