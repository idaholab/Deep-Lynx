// React
import * as React from 'react';

// Hooks
import { useAppSelector, useAppDispatch } from '../../../../app/hooks/reduxTypescriptHooks';
import axios from 'axios';
// Import Redux Actions
import { appStateActions } from '../../../../app/store/index';
import { v4 as uuidv4 } from 'uuid';
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
// Styles
import { styled, alpha } from '@mui/material/styles';
import '../../../styles/App.scss';
// @ts-ignore
import COLORS from '../../../styles/variables';
import ObjectName from './ObjectName';

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
// const nodeList = data;
const [nodeList, setNodeList] = React.useState(data);
// const [nodeList, setNodeList] = React.useState<any[]>([]);
// React.useEffect(() => {
//   setNodeList(data);
// }, [data]);

const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  const [selected, setSelected] = React.useState<string | false>(false);
  const host: string = useAppSelector((state: any) => state.appState.host);
  const token: string = useAppSelector((state: any) => state.appState.token);
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

  
   // Selected Asset Object
   type selectedAssetObject = any;
  const selectedAssetObject: selectedAssetObject = useAppSelector((state: any) => state.appState.selectedAssetObject);

  // Delete session 
  const [openDeleteModal, setOpenDeleteModal] = React.useState<boolean>(false);
  const [selectedObject, setSelectedObject] = React.useState<any>(null);
  const handleOpenDeleteModal = (object: any) => {
    setSelectedObject(object);
    setOpenDeleteModal(true);
  };
  const handleCloseDeleteModal = () => {
    setOpenDeleteModal(false);
  };
  
const handleDeleteSession = async (sessionId: string) => {
  try {
    await axios.delete(`${host}/containers/${container}/serval/sessions/${selectedAssetObject.id}/objects/${selectedObject.id}`, {
      headers: {
        Authorization: `bearer ${token}`
      },
    }).then (
      (response: any) => {
        dispatch(appStateActions.removeObject({ sessionId: selectedAssetObject.id, playerId: selectedObject.state.id }));
        // / Update the object list by filtering out the deleted object
        const updatedObjectList = nodeList.objects.filter((object:any) => object.id !== selectedObject.id);
        setNodeList((prevNodeList: any) => ({
          ...prevNodeList,
          objects: updatedObjectList,
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
        <Box sx={{ borderRight: `1px solid ${COLORS.colorDarkgray2}`, paddingRight: '6px', marginRight: '6px' }}>
          Id
        </Box>
        <Box sx={{ maxWidth: '165px', overflow: 'hidden', position: 'relative', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Player Name
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
        <h5>Delete Object</h5>
        <p>Are you sure you want to delete this object?</p>
        <Button
          variant="contained"
          disableElevation
          onClick={() => handleDeleteSession(selectedObject.id)}
          size="small"
          style={{ marginTop: '16px' }}
        >
          Delete
        </Button>
      </div>
    </Modal>
      <Box sx={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: '0', borderTop: `1px solid ${COLORS.colorDarkgray}` }}>
        <List dense sx={{ paddingTop: '0' }}>
          {nodeList.objects.map((object: any, index: number) => (
            <ListItem
              key={uuidv4()}
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
    </>
  );
}

export default ObjectList;
