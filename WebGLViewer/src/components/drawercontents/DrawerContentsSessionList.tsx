// React
import * as React from 'react';

// Hooks
import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';
import { useAddSessionMutation, useDeleteSessionMutation } from '../../../app/services/sessionsDataApi';

// Import Redux Actions
import { appStateActions } from '../../../app/store/index';

// MUI Components
import {
  Box,
  Button,
  Grid,
  Input,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  MenuItem,
  Modal,
  Typography,
} from '@mui/material';
import Menu, { MenuProps } from '@mui/material/Menu';
import Divider from '@mui/material/Divider';

// MUI Icons
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

// Custom Components
import LoadingProgress from '../elements/LoadingProgress';

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
  data: Array<any>,
};

const DrawerContentsSessionList: React.FC<Props> = ({
  data,
}) => {
  const sessionList = data;

  const dispatch = useAppDispatch();

  // DeepLynx
  const host: string = useAppSelector((state: any) => state.appState.host);
  const token: string = useAppSelector((state: any) => state.appState.token);
  const metadata: string = useAppSelector((state: any) => state.appState.metadata);
  const container: string = useAppSelector((state: any) => state.appState.container);
  const query: boolean = useAppSelector((state: any) => state.appState.query);
  const tagId: string = useAppSelector((state: any) => state.appState.tagId);

  const openDrawerLeftState: boolean = useAppSelector((state: any) => state.appState.openDrawerLeft);
  const openDrawerLeftWidth: number = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  const [selected, setSelected] = React.useState<string | false>(false);

  const handleSelectSessionObject = (obj: any, numPixels: number, selectedItem: string) => {
    dispatch(appStateActions.selectSessionObject(obj));
    dispatch(appStateActions.setDrawerLeftWidth(numPixels));
    setSelected(selectedItem);
  };

  // Menu
  const [anchorEl, setAnchorEl] = React.useState<any>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (index: number, event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl({ [index]: event.currentTarget });
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Modal
  const [modalOpen, setModalOpen] = React.useState(false);

  const handleToggleModal = () => {
    setModalOpen(!modalOpen)
  }

  // Add a Session
  const initialValue = { name: '' }
  const [newSession, setNewSession] = useState(initialValue);
  const [addNewSession, { isLoading: isLoadingAddNewSession }] = useAddSessionMutation();

  const handleAddSessionInputChange = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    setNewSession((prev) => ({
      ...prev,
      [target.name]: target.value,
    }))
  }

  const handleAddNewSession = async () => {
    try {
      await addNewSession({
        host: host,
        container: container,
        sessionData: newSession,
      }).unwrap();
      setNewSession(initialValue);
    } catch (error) {
      console.error('There was an error!', error);
    }
    handleToggleModal();
  };

  // Delete a Session
  const [deleteSession, { isLoading: isLoadingDeleteSession }] = useDeleteSessionMutation();

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await deleteSession({
        host: host,
        container: container,
        sessionId,
      }).unwrap();
      console.log('Response:', response);
      dispatch(appStateActions.deleteSession(sessionId));
    } catch (error) {
      console.error('There was an error!', error);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'row', fontSize: '14px', margin: '0px 16px 6px 16px' }}>
        <Box sx={{ maxWidth: '165px', overflow: 'hidden', position: 'relative', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Name
        </Box>
        <Button
          id="customized-button"
          aria-controls={modalOpen ? 'customized-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={modalOpen ? 'true' : undefined}
          variant="contained"
          disableElevation
          onClick={handleToggleModal}
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
      {!sessionList || sessionList.length === 0 ? (
        <LoadingProgress text={'Loading Sessions'}/>
      ) :(
        <Box sx={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: '0', borderTop: `1px solid ${COLORS.colorDarkgray}` }}>
          <List dense sx={{ paddingTop: '0' }}>
            {sessionList.map((object: any, index: number) => (
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
                      onClick={(e) => handleMenuClick(index, e)}
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
                      onClose={handleMenuClose}
                    >
                      <MenuItem onClick={() => handleDeleteSession(object.id)} disableRipple>
                        <DeleteIcon />
                        Delete Session
                      </MenuItem>
                    </StyledMenu>
                  </>
                }
              >
                <ListItemButton
                  onClick={() => handleSelectSessionObject(object, 800, `listItem${index+1}`)}
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
                      <Box sx={{ maxWidth: '165px', overflow: 'hidden', position: 'relative', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        { object.name }
                      </Box>
                    </Box>
                  </ListItemText>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Modal open={modalOpen} onClose={handleToggleModal} disableEnforceFocus>
            <Box
              sx={{
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
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Input
                    id="session-name"
                    name="name"
                    placeholder="Enter session name"
                    value={newSession.name}
                    onChange={handleAddSessionInputChange}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="contained"
                    disableElevation
                    onClick={handleAddNewSession}
                    size="small"
                    sx={{ marginTop: '16px' }}
                  >
                    Add Session
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Modal>
          {/* <Modal open={openDeleteModal} onClose={handleCloseDeleteModal} disableEnforceFocus>
            <Box
              sx={{
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
              <Typography variant="h5">
                Delete Session
              </Typography>
              <p>Are you sure you want to delete this session?</p>
              <Button
                variant="contained"
                disableElevation
                onClick={() => handleDeleteSession(selectedPlayer.id)}
                size="small"
                sx={{ marginTop: '16px' }}
              >
                Delete Session
              </Button>
            </Box>
          </Modal> */}
        </Box>
      )}
    </>
  );
}

export default DrawerContentsSessionList;
