// React
import * as React from 'react';

// Hooks
import { useAppSelector, useAppDispatch } from '../../../../app/hooks/reduxTypescriptHooks';
import { useGetAllPlayersQuery } from '../../../../app/services/sessionsDataApi';
import { useDeletePlayerMutation } from '../../../../app/services/sessionsDataApi';

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
} from '@mui/material';
import Menu, { MenuProps } from '@mui/material/Menu';

// MUI Icons
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
// Styles
import { styled, alpha } from '@mui/material/styles';
import '../../../styles/App.scss';
// @ts-ignore
import COLORS from '../../../styles/variables';

// Custom Components
import LoadingProgress from '../../elements/LoadingProgress';

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
  // data: any;
};

const PlayerList: React.FC<Props> = ({ }) => {
  // const playerList = data;
  const dispatch = useAppDispatch();

  const openDrawerLeftState: boolean = useAppSelector((state: any) => state.appState.openDrawerLeft);
  const openDrawerLeftWidth: number = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  const [selected, setSelected] = React.useState<string | false>(false);
  const host: string = useAppSelector((state: any) => state.appState.host);
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
  
  // Replace this with your actual sessions state
  const sessions = useAppSelector(state => state.appState.sessions); 
  const currentSession = useAppSelector(state=>state.appState.selectedSessionObject);
  const handleMenuClick = (index: number, event: React.MouseEvent<HTMLElement>) => {
  setAnchorEl({ [index]: event.currentTarget });
  };

  let sessionId: any;
  if ('id' in currentSession) {
    sessionId = currentSession?.id;
  } else {
    sessionId = null;
  }

  // Get all players
  const { data: playersDataResponse, isLoading: isLoadingPlayersData } = useGetAllPlayersQuery(
    {
      host, 
      container,
      sessionId
    },
  );

  let playerList =playersDataResponse?.value || [];
  if (playersDataResponse?.value) {
    try {
      playerList = JSON.parse(playersDataResponse.value);
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  }

  // Delete a Player
  const [deletePlayer, { isLoading: isLoadingDeleteSession }] = useDeletePlayerMutation();
  const handleDeletePlayer = async (playerId: string) => {
    try {
      const response = await deletePlayer({
        host: host,
        container: container,
        sessionId,
        playerId,
      }).unwrap()
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
      {isLoadingPlayersData &&
      <LoadingProgress text={'Loading Selected Players'}/>
    }

    {(!isLoadingPlayersData && (playerList.length === 0)) &&
      <Box sx={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: '0', borderTop: `1px solid ${COLORS.colorDarkgray}` }}>
      <List dense sx={{ paddingTop: '0' }}>
        <ListItem
          disablePadding
        >
          <ListItemText sx={{ padding: '6px 0px', textAlign: 'center' }}>
            No data to display
          </ListItemText>
        </ListItem>
      </List>
    </Box>
    }

   {(!isLoadingPlayersData && (playerList.length !== 0)) &&
      <Box sx={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: '0', borderTop: `1px solid ${COLORS.colorDarkgray}` }}>
        <List dense sx={{ paddingTop: '0' }}>
          {playerList.map((object: any, index: number) => (
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
                    anchorEl={anchorEl && anchorEl[index]}
                    open={Boolean(anchorEl && anchorEl[index])}
                    onClose={handleClose}
                  >
                     <MenuItem onClick={() => handleDeletePlayer(object.state.id)} disableRipple>
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
          }
    </>
  );
};

export default PlayerList;
