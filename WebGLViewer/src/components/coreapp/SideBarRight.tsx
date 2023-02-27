// React
import * as React from 'react';

// Hooks
import { useAppSelector } from '../../../app/hooks/reduxTypescriptHooks';

// MUI Styles
import { useTheme } from '@mui/material/styles';

// MUI Components
import {
  Drawer,
  Typography
} from "@mui/material";

export default function SideBarRight(props: any) {
  const { children } = props;

  const theme = useTheme();

  type openDrawerRightState = boolean;
  const openDrawerRightState: openDrawerRightState = useAppSelector((state: any) => state.appState.openDrawerRight);

  type openDrawerRightWidth = number;
  const openDrawerRightWidth: openDrawerRightWidth = useAppSelector((state: any) => state.appState.openDrawerRightWidth);

  return (
    <>
      <Drawer
        sx={{
          width: openDrawerRightWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: openDrawerRightWidth,
            boxSizing: 'border-box',
            marginTop: '64px',
          },
        }}
        variant="persistent"
        anchor="right"
        open={openDrawerRightState}
      >
        <Typography
          variant="h3"
          sx={{
            padding: '16px 16px 0px 16px',
          }}
        >
          Data View
        </Typography>
      </Drawer>
    </>
  )
}
