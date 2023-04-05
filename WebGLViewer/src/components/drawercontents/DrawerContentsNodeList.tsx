// React
import * as React from 'react';

// Hooks
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Import Redux Actions
import { appStateActions } from '../../../app/store/index';

// MUI Components
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  MenuItem,
} from '@mui/material';
import Menu, { MenuProps } from '@mui/material/Menu';
import Divider from '@mui/material/Divider';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// MUI Icons
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

  const handleSelectAssetObject = (obj: any, numPixels: number, selectedItem: string) => {
    dispatch(appStateActions.selectAssetObject(obj));
    dispatch(appStateActions.setDrawerLeftWidth(numPixels));
    setSelected(selectedItem);
  };

  const handleSelectAssetOnScene = (payload: any) => {
    handleClose()
    dispatch(appStateActions.selectAssetOnScene(payload.properties.name))
  };

  const handleHighlightAssetOnScene = (payload: any) => {
    handleClose()
    dispatch(appStateActions.highlightAssetOnScene(payload.properties.name))
  };

  const handleShowAssetOnGraph = (payload: any) => {
    handleClose()
    console.log('Action to \"Show On Graph\" clicked!')
  }

  // Menu
  // const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [anchorEl, setAnchorEl] = React.useState<any>(null);
  const open = Boolean(anchorEl);

  const handleClick = (index: number, event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl({ [index]: event.currentTarget });
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
                  className={`menu-button-${index}`}
                  aria-controls={open ? 'customized-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? 'true' : undefined}
                  variant="contained"
                  disableElevation
                  onClick={(e) => handleClick(index, e)}
                  endIcon={<KeyboardArrowDownIcon />}
                  size="small"
                  sx={{
                    color: 'white',
                    padding: '0px 4px 0 8px',
                    '& span': {
                      fontSize: '14px',
                      marginBottom: '1px',
                      '&:first-of-type': {
                        marginRight: '-6px'
                      },
                    }
                  }}
                >
                  <span>Actions</span>
                </Button>
                <StyledMenu
                  id="customized-menu"
                  MenuListProps={{
                    'aria-labelledby': 'customized-button',
                  }}
                  anchorEl={
                    // Check to see if the anchor is set.
                    anchorEl && anchorEl[index]
                  }
                  open={
                    // Check to see if the anchor is set.
                    Boolean(anchorEl && anchorEl[index])
                  }
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
                      { object.properties?.name }
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
