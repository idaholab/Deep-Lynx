// React
import * as React from 'react';

// Hooks
import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import classNames from 'classnames';

// Import Redux Actions
import { appStateActions } from '../../../app/store/index';

// MUI Styles
import { useTheme } from '@mui/material/styles';

// MUI Components
import {
  Box,
  Tooltip,
  Typography
} from '@mui/material';

// MUI Icons
import InfoIcon from '@mui/icons-material/Info';

// Styles
import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../styles/variables';

export default function DrawerContentsSettings(props: any) {
  const { children } = props;

  const theme = useTheme();
  const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', padding: '16px 0px 0', overflowX: 'hidden', }}
    >

      <Box sx={{ flex: '1, 1, auto', display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '12px' }}>
        <Typography
          variant="h3"
          sx={{
            alignItems: 'center',
            padding: '0 0 0 16px'
          }}
        >
          Settings
        </Typography>
        <Tooltip title="View scene asset/object information. Select and Highlight objects. Show on Graph. View Data.">
          <InfoIcon sx={{ fill: COLORS.colorDarkgray2, marginLeft: '10px', marginRight: '10px', height: '15px', width: '15px' }} />
        </Tooltip>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: '16px' }}>
        Settings go here
      </Box>
    </Box>
  );
}
