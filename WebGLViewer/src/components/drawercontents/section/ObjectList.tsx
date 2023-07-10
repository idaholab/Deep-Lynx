// React
import * as React from 'react';

// Hooks
import { useAppSelector, useAppDispatch } from '../../../../app/hooks/reduxTypescriptHooks';
import{useDeleteObjectMutation, useDeletePlayerMutation} from '../../../../app/services/sessionsDataApi'
// Import Redux Actions
import { appStateActions } from '../../../../app/store/index';
// import { v4 as uuidv4 } from 'uuid';
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
  Typography,
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
import ObjectName from './ObjectName';
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

const ObjectList: React.FC<Props> = ({
  data

}) => {
const objectList = data;
const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  const [selected, setSelected] = React.useState<string | false>(false);
  const host: string = useAppSelector((state: any) => state.appState.host);
  const container: string = useAppSelector((state: any) => state.appState.container);

  // Menu
  // const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [anchorEl, setAnchorEl] = React.useState<any>(null);
  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;
  const ref = React.useRef(null);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [popoverText, setPopoverText] = React.useState("");
  const handleClick = (name: string) => {
    setPopoverOpen(true);
    setPopoverText(name);
  };

  const handleClose = () => {
    setPopoverOpen(false);
    setPopoverText("");
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

  
   // Selected Asset Object
   type selectedAssetObject = any;
  const selectedAssetObject: selectedAssetObject = useAppSelector((state: any) => state.appState.selectedAssetObject);

  // Delete a Session
  const [deleteObject, { isLoading: isLoadingDeleteSession }] = useDeleteObjectMutation();
const handleDeleteObject  = async (objectId: string) => {
  try {
    const response = await deleteObject({
      host: host,
      container: container,
      sessionId,
      objectId,
    }).unwrap();
    console.log('Response:', response);
  
  } catch (error) {
    console.error('There was an error!', error);
  }
};

 

  return (
    <>
    <Box sx={{ display: 'flex', flexDirection: 'row', fontSize: '14px', margin: '0px 16px 6px 16px' }}>
      <Box sx={{ borderRight: `1px solid ${COLORS.colorDarkgray2}`, paddingRight: '6px', marginRight: '6px', fontWeight: 'bold' }}>
        Id
      </Box>
      <Box sx={{ maxWidth: '165px', overflow: 'hidden', position: 'relative', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
        Object Name
      </Box>
    </Box>
    {!objectList || objectList.length === 0 ? (
        <LoadingProgress text={'Loading Sessions'}/>
      ) :(
    <Box sx={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: '0', borderTop: `1px solid ${COLORS.colorDarkgray}` }}>
      <List dense sx={{ paddingTop: '0' }}>
        {objectList.objects.map((object: any, index: number) => (
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
                    anchorEl={anchorEl && anchorEl[index]}
                    open={Boolean(anchorEl && anchorEl[index])}
                    onClose={handleClose}
                  >
                     <MenuItem onClick={() => handleDeleteObject(object.id)} disableRipple>
                      <DeleteIcon />
                      Delete
                    </MenuItem>
                  </StyledMenu>
              </>
            }
          >
            <ListItemButton
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
                  <ObjectName name={object.state} />
                  </Box>
               
          
                </Box>
              </ListItemText>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
        )}
  </>
  );
}

export default ObjectList;
