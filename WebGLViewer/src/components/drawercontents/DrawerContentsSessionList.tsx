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
  Modal,
  TextField
} from '@mui/material';
import Menu, { MenuProps } from '@mui/material/Menu';
import Divider from '@mui/material/Divider';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// MUI Icons
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

// Styles
import { styled, alpha } from '@mui/material/styles';
import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../styles/variables';
import axios from 'axios';
import { Snackbar } from '@mui/material';
import { useState } from 'react';

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

const DrawerContentsSectionList: React.FC<Props> = ({
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
 
  const [selectedPlayer, setSelectedPlayer] = React.useState<any>(null);
  // const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const handleOpenDeleteModal = (player: any) => {
    setSelectedPlayer(player);
    };

  //  Handles Add section 
  const [openModal, setOpenModal] = useState(false);
  const [sessionName, setSessionName] = useState('');

  const handleOpenModal = () => {
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const handleSessionNameChange = (event:any) => {
    setSessionName(event.target.value);
  };

  const handleAddSession = async () => {
    try {
      const response = await fetch(`http://0.0.0.0:8091/containers/1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: sessionName })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      } else {
        const jsonResponse = await response.json();
        console.log(jsonResponse);
      }
    } catch (error) {
      console.error('There was an error!', error);
    }

    handleCloseModal();
  };


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
  const AddSession = async () => {
    const sessionName = "Session 4";  // replace this with the actual session name
    const container_id = '1'; // replace with your container id
    try {
      const response = await fetch(`http://0.0.0.0:8091/containers/${container_id}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: sessionName })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      } else {
        const jsonResponse = await response.json();
        console.log(jsonResponse); // remove this line in production
      }
    } catch (error) {
      console.error('There was an error!', error);
      setSnackbarMessage(`Error: ${error}`);
      setSnackbarOpen(true);
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'row', fontSize: '14px', margin: '0px 16px 6px 16px' }}>
        <Box sx={{ borderRight: `1px solid ${COLORS.colorDarkgray2}`, paddingRight: '6px', marginRight: '6px' }}>
          {/* Id */}
        </Box>
        <Box sx={{ maxWidth: '165px', overflow: 'hidden', position: 'relative', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Title
        </Box>
        <Button
                  id="customized-button"
                  // className={`menu-button-${index}`}
                  aria-controls={open ? 'customized-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? 'true' : undefined}
                  variant="contained"
                  disableElevation
                  onClick={handleOpenModal}
                  endIcon={<AddIcon />}
                  size="small"
                  sx={{
                    color: 'white',
                    padding: '0px 8px 0 8px',
                    marginLeft: 'auto',
                    '& span': {
                      fontSize: '14px',
                      marginBottom: '1px',
                      '&:first-of-type': {
                        marginRight: '-6px'
                      },
                    }
                  }}
                >
                  <span>Add Session</span>
                </Button>
      </Box>
      <Modal open={openModal} onClose={handleCloseModal}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            backgroundColor: 'white',
            border: '2px solid black',
            boxShadow: '24px',
            padding: '16px'
          }}
        >
          <TextField
            id="session-name"
            label="Session Name"
            value={sessionName}
            onChange={handleSessionNameChange}
            fullWidth
          />
          <Button
            variant="contained"
            disableElevation
            onClick={handleAddSession}
            size="small"
            style={{ marginTop: '16px' }}
          >
            Add Session
          </Button>
        </div>
      </Modal>
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
                  // className={`menu-button-${index}`}
                  aria-controls={open ? 'customized-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={open ? 'true' : undefined}
                  variant="contained"
                  disableElevation
                  onClick={(e) => AddSession()}
                  // endIcon={<KeyboardArrowDownIcon />}
                  size="small"
                  sx={{
                    color: 'white',
                    padding: '0px 4px 0 4px',
                    marginLeft: 'auto',
                    '& span': {
                      fontSize: '14px',
                      marginBottom: '1px',
                      '&:first-of-type': {
                        marginRight: '-6px'
                      },
                    }
                  }}
                >
                   <MenuItem onClick={() => handleOpenDeleteModal(object)}  disableRipple>
                    <DeleteIcon />
                   Delete
                  </MenuItem>
                </Button>
                {/* <Button
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
                </Button> */}
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
                  <MenuItem onClick={() => handleOpenDeleteModal(object)}  disableRipple>
                    <DeleteIcon />
                   Delete
                  </MenuItem>
                  {/* <Divider sx={{ my: 0.5 }} /> */}
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
                      {/* { object.id } */}
                       {/* { object.id } */}
                    </Box>
                    <Box sx={{ maxWidth: '165px', overflow: 'hidden', position: 'relative', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {/* { object.properties?.name } */}
                      { object.name }
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

export default DrawerContentsSectionList;
