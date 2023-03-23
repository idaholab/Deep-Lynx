// React
import * as React from 'react';

// Hooks
import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import classNames from 'classnames';
import axios from 'axios';

// Import Redux Actions
import { appStateActions } from '../../../app/store/index';

// MUI Styles
import { useTheme } from '@mui/material/styles';

// MUI Components
import {
  Box,
  Button,
  FormControl,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  MenuItem,
  OutlinedInput,
  Typography
} from '@mui/material';
import Menu, { MenuProps } from '@mui/material/Menu';
import Divider from '@mui/material/Divider';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// MUI Icons
import InfoIcon from '@mui/icons-material/Info';
import HubIcon from '@mui/icons-material/Hub';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import HighlightIcon from '@mui/icons-material/Highlight';

// Styles
import { styled, alpha } from '@mui/material/styles';
import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../styles/variables';

const StyledMenu = styled((props: MenuProps) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'right',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'right',
    }}
    {...props}
  />
))(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: 6,
    marginTop: theme.spacing(1),
    minWidth: 180,
    color:
      theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300],
    boxShadow:
      'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
    '& .MuiMenu-list': {
      padding: '4px 0',
    },
    '& .MuiMenuItem-root': {
      '& .MuiSvgIcon-root': {
        fontSize: 18,
        color: theme.palette.text.secondary,
        marginRight: theme.spacing(1.5),
      },
      '&:active': {
        backgroundColor: alpha(
          theme.palette.primary.main,
          theme.palette.action.selectedOpacity,
        ),
      },
    },
  },
}));

type Props = {
  data: any
};

const DrawerContentsNodeList: React.FC<Props> = ({
  data
}) => {
  const nodeList = data;

  const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  const [selected, setSelected] = React.useState<string | false>(false);

  type selectedAssetObject = any;
  const selectedAssetObject: selectedAssetObject = useAppSelector((state: any) => state.appState.selectedAssetObject);
  const handleSelectAssetObject = (obj: any, numPixels: number, selectedItem: string) => {
    console.log("obj", obj)
    dispatch(appStateActions.selectAssetObject(obj));
    dispatch(appStateActions.setDrawerLeftWidth(numPixels));
    setSelected(selectedItem);
  };

  type selectAssetOnScene = any;
  const selectAssetOnScene: selectAssetOnScene = useAppSelector((state: any) => state.appState.selectAssetOnScene);
  const handleSelectAssetOnScene = (payload: any) => {
    console.log(payload)
    // dispatch(appStateActions.selectAssetOnScene(payload.properties.Name))
  };

  type highlightAssetOnScene = any;
  const highlightAssetOnScene: highlightAssetOnScene = useAppSelector((state: any) => state.appState.highlightAssetOnScene);
  const handleHighlightAssetOnScene = (payload: any) => {
    dispatch(appStateActions.highlightAssetOnScene(payload.properties.Name))
  };

  const handleShowAssetOnGraph = (payload: any) => {
    handleClose()
    console.log('Action to \"Show On Graph\" clicked!')
  }

  // Menu
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'row', fontSize: '14px', margin: '0px 16px 6px 16px' }}>
        <Box sx={{ borderRight: `1px solid ${COLORS.colorDarkgray2}`, paddingRight: '6px', marginRight: '6px' }}>
          Id
        </Box>
        <Box sx={{ maxWidth: '165px', overflow: 'hidden', position: 'relative', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Title
        </Box>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: '0', borderTop: `1px solid ${COLORS.colorDarkgray}` }}>
        <List dense sx={{ paddingTop: '0' }}>
          {nodeList.map((object: any, index: number) => (
            <ListItem
              key={object.id}
              disablePadding
              sx={{ borderBottom: `1px solid ${COLORS.colorDarkgray}` }}
              secondaryAction={
                <>
                <Button
                  id="customized-button"
                  aria-controls={open ? 'customized-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? 'true' : undefined}
                  variant="contained"
                  disableElevation
                  onClick={handleClick}
                  endIcon={<KeyboardArrowDownIcon />}
                  size="small"
                  sx={{
                    color: 'white',
                    padding: '0px 8px',
                    marginLeft: 'auto',
                    '& span': {
                      fontSize: '12px'
                    }
                  }}
                >
                  <Typography>Actions</Typography>
                </Button>
                <StyledMenu
                  id="customized-menu"
                  MenuListProps={{
                    'aria-labelledby': 'customized-button',
                  }}
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleClose}
                >
                  <MenuItem onClick={() => handleSelectAssetOnScene(object)} disableRipple>
                    <RadioButtonCheckedIcon />
                    Select On Scene
                  </MenuItem>
                  <MenuItem onClick={() => handleHighlightAssetOnScene(object)} disableRipple>
                    <HighlightIcon />
                    Highlight On Scene
                  </MenuItem>
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem onClick={() => handleShowAssetOnGraph(object)} disableRipple>
                    <HubIcon />
                    Show On Graph
                  </MenuItem>
                </StyledMenu>
                </>
              }
            >
              <ListItemButton
                onClick={() => handleSelectAssetObject(object, 800, `listItem${index+1}`)}
                selected={selected === `listItem${index+1}`}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: `${COLORS.colorListSelectGray} !important`
                  },
                  '&.Mui-focusVisible': {
                    backgroundColor: `${COLORS.colorListSelectGray} !important`
                  },
                  '&:hover': {
                    backgroundColor: `${COLORS.colorListSelectGray} !important`
                  }
                }}
              >
                <ListItemText>
                  <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                    <Box sx={{ borderRight: `1px solid ${COLORS.colorDarkgray2}`, paddingRight: '6px', marginRight: '6px' }}>
                      { object.id }
                    </Box>
                    <Box sx={{ maxWidth: '165px', overflow: 'hidden', position: 'relative', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      { object.properties?.Name }
                    </Box>
                  </Box>
                </ListItemText>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </>
  );
}

export default DrawerContentsNodeList;
