// React
import * as React from 'react';

// Hooks
import { useAppSelector, useAppDispatch } from '../../../../app/hooks/reduxTypescriptHooks';

// Import Redux Actions
import { appStateActions } from '../../../../app/store/index';

// MUI Components
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  MenuItem,
  Typography,
  Modal,
  TextField,
} from '@mui/material';
import Menu, { MenuProps } from '@mui/material/Menu';

// MUI Icons
import DeleteIcon from '@mui/icons-material/Delete';
// Styles
import { styled, alpha } from '@mui/material/styles';
import '../../../styles/App.scss';
// @ts-ignore
import COLORS from '../../../styles/variables';
import axios from 'axios';
import { useEffect } from 'react';

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
    color: theme.palette.mode === 'light' ? 'rgb(55, 65, 81)' : theme.palette.grey[300],
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
        backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
      },
    },
  },
}));

type Props = {
  data: any;
};

const PlayerList: React.FC<Props> = ({ data }) => {
//  const nodeList = data;
 const [nodeList, setNodeList] = React.useState(data);
  const [selectedPlayer, setSelectedPlayer] = React.useState<any>(null);
  // const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  const [selected, setSelected] = React.useState<string | false>(false);
  const host: string = useAppSelector((state: any) => state.appState.host);
  const token: string = useAppSelector((state: any) => state.appState.token);
  const container: string = useAppSelector((state: any) => state.appState.container);

   // Selected Asset Object
   type selectedAssetObject = any;
  const selectedAssetObject: selectedAssetObject = useAppSelector((state: any) => state.appState.selectedAssetObject);

   // Menu
   const [anchorEl, setAnchorEl] = React.useState<any>(null);
   const open = Boolean(anchorEl);
 
   const handleClose = () => {
     setAnchorEl(null);
   };
  
  // Delete session 
  const [openDeleteModal, setOpenDeleteModal] = React.useState<boolean>(false);
  const handleOpenDeleteModal = (player: any) => {
    console.log(player.state.id)
    setSelectedPlayer(player);
    setOpenDeleteModal(true);
  };
  const handleCloseDeleteModal = () => {
    setOpenDeleteModal(false); 
  };
  // Replace this with your actual sessions state
  const sessions = useAppSelector(state => state.appState.sessions); 
  const currentSession = sessions.find(session => session.id === selectedAssetObject.id);
  const players = currentSession ? currentSession.players : [];
const handleDeleteSession = async (sessionId: string) => {
  try {
    await axios.delete(`${host}/containers/${container}/serval/sessions/${selectedAssetObject.id}/players/${selectedPlayer.state.id}`, {
      headers: {
        Authorization: `bearer ${token}`
      },
    }).then (
      (response: any) => {
        dispatch(appStateActions.removePlayer({ sessionId: selectedAssetObject.id, playerId: selectedPlayer.state.id }));
        // const updatePlayerList = nodeList.users.filter((player:any) => player.id !== selectedPlayer.state.id);
        const updatePlayerList = nodeList.users.filter((player: any) => player.state.id !== selectedPlayer.state.id);


        setNodeList((prevNodeList: any) => ({
          ...prevNodeList,
          users: updatePlayerList,
        }));
        handleCloseDeleteModal();
      })
   
  } catch (error) {
    console.error('There was an error!', error);
  }
};


  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'row', fontSize: '14px', margin: '0px 16px 6px 16px' }}>
        <Box sx={{ fontWeight: 'bold' }}>
          Id
        </Box>
      </Box>
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
        <h5>Delete Player</h5>
        <p>Are you sure you want to delete this player?</p>
        <Button
          variant="contained"
          disableElevation
          onClick={() => handleDeleteSession(selectedPlayer.state.id)}
          size="small"
          style={{ marginTop: '16px' }}
        >
          Delete
        </Button>
      </div>
    </Modal>
      <Box sx={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: '0', borderTop: `1px solid ${COLORS.colorDarkgray}` }}>
        <List dense sx={{ paddingTop: '0' }}>
          {nodeList.users.map((object: any, index: number) => (
            <ListItem
              key={object.state.id}
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
                    <MenuItem onClick={() => handleOpenDeleteModal(object)} disableRipple>
                      <DeleteIcon />
                      Delete
                    </MenuItem>
                  </Button>
                  <StyledMenu
                    id="customized-menu"
                    MenuListProps={{
                      'aria-labelledby': 'customized-button',
                    }}
                    anchorEl={anchorEl && anchorEl[index]}
                    open={Boolean(anchorEl && anchorEl[index])}
                    onClose={handleClose}
                  >
                     <MenuItem onClick={() => handleOpenDeleteModal(object)} disableRipple>
                      <DeleteIcon />
                      Delete
                    </MenuItem>
                  </StyledMenu>
                </>
              }
            >
              <ListItemButton
                selected={selected === `listItem${index + 1}`}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: `${COLORS.colorListSelectGray} !important`,
                  },
                  '&.Mui-focusVisible': {
                    backgroundColor: `${COLORS.colorListSelectGray} !important`,
                  },
                  '&:hover': {
                    backgroundColor: `${COLORS.colorListSelectGray} !important`,
                  },
                }}
              >
                <ListItemText>
                  <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                    <Box sx={{  }}>
                      {object.state.id}
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
};

export default PlayerList;
