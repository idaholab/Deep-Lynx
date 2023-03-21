// React
import * as React from 'react';
import { Link } from 'react-router-dom';

// Hooks
import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import classNames from 'classnames';
import { v4 as uuidv4 } from 'uuid';

// Import Redux Actions
import { appStateActions } from '../../../app/store/index';

// MUI Styles
import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles';

// MUI Components
import {
  Box,
  Button,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  OutlinedInput,
  Paper,
  Stack,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';

// MUI Transitions
import Fade from '@mui/material/Fade';

// MUI Icons
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import CategoryIcon from '@mui/icons-material/Category';
import ImageIcon from '@mui/icons-material/Image';
import SettingsIcon from '@mui/icons-material/Settings';

// Custom Components
import DrawerContentsNodeList from '../drawercontents/DrawerContentsNodeList';
import DrawerContentsNodeInfo from '../drawercontents/DrawerContentsNodeInfo';
import DrawerContentsSceneList from '../drawercontents/DrawerContentsSceneList';
import DrawerContentsSettings from '../drawercontents/DrawerContentsSettings';

// Styles
import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../../src/styles/variables';

const DrawerLeft = (props: any) => {
  const { children } = props;
  const [selected, setSelected] = useState('nodeList');

  const theme = useTheme();
  const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  const handleToggleOpenDrawerLeft = () => {
    dispatch(appStateActions.toggleDrawerLeft());
  };

  type selectedAssetObject = any;
  const selectedAssetObject: selectedAssetObject = useAppSelector((state: any) => state.appState.selectedAssetObject);

  const handleSelectMenuLink = (selectedLink: string) => {
    setSelected(selectedLink);
    console.log(selectedLink)
  };

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  const [assetObjectIsSelected, setAssetObjectIsSelected] = React.useState(false);

  if (Object.keys(selectedAssetObject).length === 0){
    dispatch(appStateActions.setDrawerLeftWidth(430));
  }

  const menuItemMatchesComponent = (pane: string) => selected === pane;

  const menuLinkList = [
    {
      title: 'Nodes',
      icon: CategoryIcon,
      pane: 'nodeList'
    },
    {
      title: 'Scenes',
      icon: ImageIcon,
      pane: 'sceneList'
    },
    {
      title: 'Settings',
      icon: SettingsIcon,
      pane: 'settings'
    },
  ]

  return (
    <Drawer variant="permanent" open={openDrawerLeftState}
      sx={{ 
        ...(openDrawerLeftState === true && {
          transition: 'width .4s',
          width: openDrawerLeftWidth,
          '& .MuiDrawer-paper': {
            transition: 'width .4s',
            width: openDrawerLeftWidth
          }
        }),
        ...(openDrawerLeftState === false && {
          transition: 'width .4s',
          width: '64px',
          '& .MuiDrawer-paper': {
            transition: 'width .4s',
            width: '64px'
          }
        })
      }}
    >
      <Box sx={{ display: 'flex', height: '100%', marginTop: '64px', alignItems: 'stretch' }}>
        <Box sx={{ display: 'flex', height: '100%', backgroundColor: COLORS.colorLightgray3 }}>
          <List sx={{ p: 0 }}>
            {/* Hamburger menu icon to open and close Drawer */}
            <ListItem key={uuidv4()} disablePadding>
              <ListItemButton
                sx={{
                  minHeight: 64,
                  px: 2.5,
                  backgroundColor: '#E3B180',
                  '&.Mui-selected': {
                    backgroundColor: `${COLORS.colorSecondary} !important`
                  },
                  '&.Mui-focusVisible': {
                    backgroundColor: `${COLORS.colorSecondary} !important`
                  },
                  '&:hover': {
                    backgroundColor: `${COLORS.colorSecondary} !important`
                  }
                }}
                onClick={handleToggleOpenDrawerLeft}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {openDrawerLeftState ? <MenuOpenIcon /> : <MenuIcon />}
                </ListItemIcon>
              </ListItemButton>
            </ListItem>

            {/* Drawer Menu link list */}
            {menuLinkList.map((menuLinkItem, index) => {
              const MenuLinkItemIcon = menuLinkItem.icon;
              return (
                <ListItem key={uuidv4()} disablePadding>
                  <ListItemButton
                    sx={{
                      minHeight: 64,
                      px: 2.5,
                      '&.Mui-selected': {
                        backgroundColor: `${COLORS.colorListSelectDarkGray} !important`
                      },
                      '&.Mui-focusVisible': {
                        backgroundColor: `${COLORS.colorListSelectDarkGray} !important`
                      },
                      '&:hover': {
                        backgroundColor: `${COLORS.colorListSelectDarkGray} !important`
                      }
                    }}
                    selected={menuItemMatchesComponent(menuLinkItem.pane)}
                    onClick={() => handleSelectMenuLink(menuLinkItem.pane)}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: 'auto',
                        justifyContent: 'center',
                      }}
                    >
                      <MenuLinkItemIcon />
                    </ListItemIcon>
                    {/* <ListItemText primary="Dashboard" sx={{ opacity: openDrawerLeftState ? 1 : 0, color: COLORS.colorSecondary }} /> */}
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </Box>
        <Box sx={{ display: 'flex', height: '100%', flex: '1 0', backgroundColor: COLORS.colorLightgray }}>
          {selected === 'nodeList' && 
            <>
              {(Object.keys(selectedAssetObject).length === 0) && <DrawerContentsNodeList />}
              {(Object.keys(selectedAssetObject).length !== 0) && <DrawerContentsNodeInfo />}
            </>
          }
          {selected === 'sceneList' && 
              <DrawerContentsSceneList />
          }
          {selected === 'settings' && 
            <DrawerContentsSettings />
          }
        </Box>
      </Box>
    </Drawer>
  );
}

export default DrawerLeft;
