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
  // const nodeList = data;
  const [nodeList, setNodeList] = useState<any[]>([]);
  React.useEffect(() => {
    setNodeList(data);
  }, [data]);

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
 
  // Menu
  const [anchorEl, setAnchorEl] = React.useState<any>(null);
  const open = Boolean(anchorEl);
  const handleClose = () => {
    setAnchorEl(null);
  };
  

// Add session 
 // DeepLynx
 const host: string = useAppSelector((state: any) => state.appState.host);
 const token: string = useAppSelector((state: any) => state.appState.token);
 const container: string = useAppSelector((state: any) => state.appState.container);
  const [openModal, setOpenModal] = useState(false);
  const [sessionName, setSessionName] = useState('');

  // Ref for the input element
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Function to focus on the input field when the modal is opened
  React.useEffect(() => {
    if (openModal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [openModal]);

const handleOpenModal = () => {
  setOpenModal(true);
};

const handleCloseModal = () => {
  setOpenModal(false);
};

const handleSessionNameChange = (event:any) => {
  // event.preventDefault()
  console.log(event.target.value)
  setSessionName(event.target.value);
};
React.useEffect(() => {
  console.log('sessionName has changed:', sessionName);
}, [sessionName]);

const handleAddSession = async () => {
  dispatch(appStateActions.setContainerId(container));
  try{
    await axios.post ( `${host}/containers/${container}/serval/sessions`,
      {
        name: sessionName,
      },
      {
        headers: {
          Authorization: `bearer ${token}`
        },
      }).then (
        (response: any) => {
        
          const parsedValue = JSON.parse(response.data.value);
          console.log(parsedValue)
          dispatch(appStateActions.addSession(parsedValue));
          setNodeList((prevNodeList) => [...prevNodeList, parsedValue] as any[]);
        }
      )
  }
  catch (error) {
      console.error('There was an error!', error);
    }
      
  handleCloseModal();
};

// Delete session 
const [openDeleteModal, setOpenDeleteModal] = React.useState<boolean>(false);
const handleOpenDeleteModal = (player: any) => {
  setSelectedPlayer(player);
  setOpenDeleteModal(true); // open the delete modal
};
const handleCloseDeleteModal = () => {
  setOpenDeleteModal(false); // close the delete modal
};

const handleDeleteSession = async (sessionId: string) => {
  try {
    await axios.delete(`${host}/containers/${container}/serval/sessions/${sessionId}`, {
      headers: {
        Authorization: `bearer ${token}`
      },
    }).then (
      (response: any) => {
        dispatch(appStateActions.deleteSession(sessionId));
         setNodeList(prevNodeList => prevNodeList.filter(session => session.id !== sessionId));
    
        handleCloseDeleteModal();
      })
   
  } catch (error) {
    console.error('There was an error!', error);
  }
};

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
        aria-controls={openModal ? 'customized-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={openModal ? 'true' : undefined}
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
              marginRight: '-6px',
            },
          },
        }}
      >
        <span>Add Session</span>
      </Button>
      </Box>
      <Modal open={openModal} onClose={handleCloseModal} disableEnforceFocus>
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
            padding: '16px',
          }}
        >
        {/* <TextField
        className='col-12'
          id="session-name"
          value={sessionName}
          onChange={handleSessionNameChange}
        /> */}
      <input
        className='col-12'
        id="session-name"
        value={sessionName}
        onChange={handleSessionNameChange}
      />
          <Button
          className='col-6'
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
          <Modal open={openDeleteModal} onClose={handleCloseDeleteModal} disableEnforceFocus>
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
          padding: '16px',
        }}
      >
        <h5>Delete Session</h5>
        <p>Are you sure you want to delete this session?</p>
        <Button
          variant="contained"
          disableElevation
          onClick={() => handleDeleteSession(selectedPlayer.id)}
          size="small"
          style={{ marginTop: '16px' }}
        >
          Delete Session
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
                  // onClick={(e) => AddSession()}
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
