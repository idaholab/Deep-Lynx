import * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import CssBaseline from '@mui/material/CssBaseline';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';

import MetadataPanels from '../display/MetadataPanels';

export default function SideBarLeft(props: any) {
  const { children } = props;

  const theme = useTheme();
  const [open, setOpen] = React.useState(true);

  const handleDrawerOpenState = () => {
    setOpen(state => !state);
  };

  return (
    <>
      <Typography
        variant="h3"
        sx={{
          padding: '16px 16px 0px 16px',
        }}
      >
        Data View
      </Typography>
    </>
  )
}
