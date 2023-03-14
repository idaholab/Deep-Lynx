// React
import * as React from 'react';
import { Link } from 'react-router-dom';

// Hooks
import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import classNames from 'classnames';

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
  Fade,
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

// MUI Icons
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import TuneIcon from '@mui/icons-material/Tune';
import CategoryIcon from '@mui/icons-material/Category';
import ImageIcon from '@mui/icons-material/Image';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';

// Custom Components
import DrawerContentsNodeList from '../drawercontents/DrawerContentsNodeList';
import DrawerContentsNodeInfo from '../drawercontents/DrawerContentsNodeInfo';

// Styles
import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../../src/styles/variables';


export default function DrawerLeft(props: any) {
  const { children } = props;

  const theme = useTheme();
  const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  const [searchQuery, setSearchQuery] = useState("");

  const [selected, setSelected] = React.useState<string | false>(false);

  const handleToggleOpenDrawerLeft = () => {
    dispatch(appStateActions.toggleDrawerLeft());
  };

  type selectedAssetObject = any;
  const selectedAssetObject: selectedAssetObject = useAppSelector((state: any) => state.appState.selectedAssetObject);
  const handleSelectAssetObject = (obj: any, selectedItem: string) => {
    dispatch(appStateActions.selectAssetObject(obj));
    setSelected(selectedItem);
  };

  const handleDeselectAssetObject = () => {
    dispatch(appStateActions.selectAssetObject({}));
    setSelected('');
  };

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);


  let assetObjectIsSelected;
  if (Object.keys(selectedAssetObject).length === 0){
    assetObjectIsSelected = true;
  } else {
    assetObjectIsSelected = false;
    dispatch(appStateActions.setDrawerLeftWidth(430));
  }

  console.log(assetObjectIsSelected)

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
          <List>
            <ListItem key="Math.random()" disablePadding>
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: openDrawerLeftState ? 'initial' : 'center',
                  px: 2.5,
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
            <ListItem component={Link} to="/" key="Math.random()" disablePadding>
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: openDrawerLeftState ? 'initial' : 'center',
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 'auto',
                    justifyContent: 'center',
                  }}
                >

                  <CategoryIcon />
                </ListItemIcon>
                {/* <ListItemText primary="Dashboard" sx={{ opacity: openDrawerLeftState ? 1 : 0, color: COLORS.colorSecondary }} /> */}
              </ListItemButton>
            </ListItem>

            <ListItem component={Link} to="/" key="Math.random()" disablePadding>
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: openDrawerLeftState ? 'initial' : 'center',
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 'auto',
                    justifyContent: 'center',
                  }}
                >
                  <ImageIcon />
                </ListItemIcon>
              </ListItemButton>
            </ListItem>

            <ListItem component={Link} to="/settings" key="Math.random()" disablePadding>
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: openDrawerLeftState ? 'initial' : 'center',
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 'auto',
                    justifyContent: 'center',
                  }}
                >
                  <SettingsIcon />
                </ListItemIcon>
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
        <Box sx={{ display: 'flex', height: '100%', flex: '1 0', backgroundColor: COLORS.colorLightgray }}>
          <Fade in={!assetObjectIsSelected} unmountOnExit>
              <DrawerContentsNodeList />
          </Fade>
          <Fade in={assetObjectIsSelected} unmountOnExit>
            <>
              <Button
                variant="contained"
                size="small"
                sx={{
                  position: 'absolute',
                  top: '84px',
                  right: '20px',
                  zIndex: '2',
                  '& span': {
                    fontSize: '18px'
                  }
                }}
                onClick={() => {
                  handleDeselectAssetObject()
                }}
              >
                <CloseIcon /><span>Back to list</span>
              </Button>
              <DrawerContentsNodeInfo />
            </>
          </Fade>
        </Box>
      </Box>
    </Drawer>
  );
}
