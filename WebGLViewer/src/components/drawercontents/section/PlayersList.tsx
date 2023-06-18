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
import Divider from '@mui/material/Divider';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// MUI Icons
import EditIcon from '@mui/icons-material/Edit';
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
  // const [nodeList, setNodeList] = React.useState([
  //   { id: '1', properties: { id: '1', description: 'This is a user description', name: 'Player 1' } },
  //   { id: '2', properties: { id: '2', description: 'This is a user description', name: 'Player 2' } },
  //   { id: '3', properties: { id: '3', description: 'This is a user description', name: 'Player 3' } },
  // ]);
  const [nodeList, setNodeList] = React.useState<any[]>([]);
  const API_URL = 'http://0.0.0.0:8091/containers/:container_id/sessions/:session_id/players'; 
  const [selectedPlayer, setSelectedPlayer] = React.useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  const [selected, setSelected] = React.useState<string | false>(false);
 
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        setNodeList(data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
  }, []);


  // Handle delete
  const handleDelete = () => {
    if (selectedPlayer) {
      const updatedList = nodeList.filter((player) => player.id !== selectedPlayer.id);
      setNodeList(updatedList);
      setSelectedPlayer(null);
    }
    setDeleteModalOpen(false);
  };

  const handleOpenDeleteModal = (player: any) => {
    setSelectedPlayer(player);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setSelectedPlayer(null);
    setDeleteModalOpen(false);
  };

  // Handle edit
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editedPlayer, setEditedPlayer] = React.useState<{ id: string; name: string; description: string }>({
    id: '',
    name: '',
    description: '',
  });
 
  const handleOpenEditModal = (player: any) => {
    setEditedPlayer({ 
      id: player.id, 
      name: player.properties.name, 
      description: player.properties.description 
    });
    setEditModalOpen(true);
  };
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedPlayer((prevPlayer) => ({
      ...prevPlayer,
      [name]: value,
    }));
  };
  const handleSaveEdit = () => {
    const updatedList = nodeList.map((player) =>
      player.id === editedPlayer.id 
        ? {
          ...player,
          properties: {
            ...player.properties,
            name: editedPlayer.name,
            description: editedPlayer.description
          }
        } 
        : player
    );
    setNodeList(updatedList);
    setEditedPlayer({ id: '', name: '', description: '' });
    setEditModalOpen(false);
  };
  
  // close the modal
  const handleCloseEditModal = () => {
    setEditedPlayer({ id: '', name: '', description: '' });
    setEditModalOpen(false);
  };

  const handleSelectAssetObject = (obj: any, numPixels: number, selectedItem: string) => {
    dispatch(appStateActions.selectAssetObject(obj));
    dispatch(appStateActions.setDrawerLeftWidth(numPixels));
    setSelected(selectedItem);
  };

  // Menu
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
          Player Name
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
                          marginRight: '-6px',
                        },
                      },
                    }}
                  >
                    <span>Actions</span>
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
                    <MenuItem onClick={() => handleOpenEditModal(object)} disableRipple>
                      <EditIcon />
                      Edit
                    </MenuItem>
                    <MenuItem onClick={() => handleOpenDeleteModal(object)} disableRipple>
                      <DeleteIcon />
                      Delete
                    </MenuItem>
                    <Divider sx={{ my: 0.5 }} />
                  </StyledMenu>
                </>
              }
            >
              <ListItemButton
                onClick={() => handleSelectAssetObject(object, 800, `listItem${index + 1}`)}
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
                    <Box sx={{ borderRight: `1px solid ${COLORS.colorDarkgray2}`, paddingRight: '6px', marginRight: '6px' }}>
                      {object.id}
                    </Box>
                    <Box sx={{ maxWidth: '165px', overflow: 'hidden', position: 'relative', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {object.properties?.name}
                    </Box>
                  </Box>
                </ListItemText>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      <Box>
        <Modal
          open={deleteModalOpen}
          onClose={handleCloseDeleteModal}
          aria-labelledby="delete-modal-title"
          aria-describedby="delete-modal-description"
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 400,
              bgcolor: 'background.paper',
              border: '2px solid #000',
              boxShadow: 24,
              p: 4,
            }}
          >
            <Typography id="delete-modal-title" variant="h6">
              Are you sure you want to delete this player?
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button onClick={handleCloseDeleteModal} color="primary">
                Cancel
              </Button>
              <Button onClick={handleDelete} color="error">
                Delete
              </Button>
            </Box>
          </Box>
        </Modal>
      </Box>
      <Box>
        <Modal
          open={editModalOpen}
          onClose={handleCloseEditModal}
          aria-labelledby="edit-modal-title"
          aria-describedby="edit-modal-description"
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 400,
              bgcolor: 'background.paper',
              border: '2px solid #000',
              boxShadow: 24,
              p: 4,
            }}
          >
            <Typography id="edit-modal-title" variant="h6">
              Edit Player
            </Typography>
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Name"
                name="name"
                value={editedPlayer.name}
                onChange={handleEditChange}
                fullWidth
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Description"
                name="description"
                value={editedPlayer.description}
                onChange={handleEditChange}
                fullWidth
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button onClick={handleCloseEditModal} color="primary">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} color="primary">
                Save
              </Button>
            </Box>
          </Box>
        </Modal>
      </Box>
    </>
  );
};

export default PlayerList;
