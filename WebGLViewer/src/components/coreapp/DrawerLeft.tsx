// React
import * as React from 'react';

// Hooks
import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Import Redux Actions
import { appStateActions } from '../../../app/store/index';

// MUI Components
import {
  Box,
  Button,
  Drawer,
  FormControl,
  List,
  ListItem,
  ListItemIcon,
  ListItemButton,
  OutlinedInput,
  Tooltip,
  Typography,
} from '@mui/material';


// MUI Icons
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import CategoryIcon from '@mui/icons-material/Category';
import ImageIcon from '@mui/icons-material/Image';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';

// Custom Components
import DrawerContentsNodeList from '../drawercontents/DrawerContentsNodeList';
import DrawerContentsNodeInfo from '../drawercontents/DrawerContentsNodeInfo';
import DrawerContentsSceneList from '../drawercontents/DrawerContentsSceneList';
import DrawerContentsSettings from '../drawercontents/DrawerContentsSettings';
import ButtonIconText from '../elements/ButtonIconText';

// Styles
import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../../src/styles/variables';

const queryFilterData = (query: any, data: any) => {
  if (!query) {
    return data;
  } else {
    return data.filter((d: any) => d.title.toString().toLowerCase().includes(query.toString().toLowerCase()));
  }
};

const SearchBar = ({setSearchQuery}: any) => (
  <FormControl fullWidth variant="outlined" size="small">
    <OutlinedInput
      id="search-bar"
      className="text"
      onInput={(event: React.ChangeEvent<HTMLInputElement>) => {
        const target = event.target as HTMLInputElement;
        if (target) setSearchQuery(target.value);
      }}
      aria-describedby="outlined-search-assets"
      inputProps={{
        'aria-label': 'search assets',
      }}
      placeholder="Search..."
      
    />
  </FormControl>
);

type Props = {};

const DrawerLeft: React.FC<Props> = ({}) => {

  const dispatch = useAppDispatch();

  const [selected, setSelected] = useState('nodeList');
  const [searchQuery, setSearchQuery] = useState("");
  const [nodes, setNodes] = useState(Array<{ [key: string]: any; }>);
  const [filteredData, setFilteredData] = useState(); 

  type selectedScene = string;
  const selectedScene: selectedScene = useAppSelector((state: any) => state.appState.selectedSceneObject);

  useEffect(() => {
    async function getNodes() {
      // const token = localStorage.getItem('user.token');
      const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNlcnZpY2UiLCJkaXNwbGF5X25hbWUiOiJXZWJHTCIsImVtYWlsIjoiIiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJ1c2VyX2lkIjoiMyIsImtleSI6Ik16RXdaalpqWVRndFpURmlaaTAwTkRneExXRTBNbVV0T1dVMFpEUXdNelV6TldRNSIsInNlY3JldCI6IiQyYSQxMCRnbGlFdG02RWV2ZlRmQmllN20xMmRPLjdVY2lsLnIyc2tMNjhhN3JFdEV2OWNuQWdkZEVTLiIsIm5vdGUiOm51bGwsImlkIjoiMyIsImlkZW50aXR5X3Byb3ZpZGVyX2lkIjpudWxsLCJjcmVhdGVkX2F0IjoiMjAyMy0wNC0wNlQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIzLTA0LTA2VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5IjoiMiIsIm1vZGlmaWVkX2J5IjoiMiIsInJlc2V0X3Rva2VuX2lzc3VlZCI6bnVsbCwiaWF0IjoxNjgwODEyMDA0LCJleHAiOjE3MTIzNjk2MDR9.fBFpQcdnDNc4zZ1AIReBkcY89EM8Ri7kQcQ10gnOubnM19e865D3ipZeUen4O_Jd5elJsfjwNyeW_DCJgof78A"
      // const containerId = localStorage.getItem('container');
      // const tagId = localStorage.getItem('tag');
      const containerId = 1;
      const tagId = 1;
      dispatch(appStateActions.setContainerId(containerId));

      await axios.get ( `http://localhost:8090/containers/${containerId}/graphs/tags/${tagId}/nodes`,
        {
          headers: {
            Authorization: `bearer ${token}`
          }
        }).then (
          (response: any) => {
            console.log(response.data);
            setNodes(queryFilterData(searchQuery, response.data.value));
          }
        )
    }

    getNodes();
  }, [selectedScene]);

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  const handleToggleOpenDrawerLeft = () => {
    dispatch(appStateActions.toggleDrawerLeft());
    if (openDrawerLeftWidth === 64) {
      dispatch(appStateActions.setDrawerLeftWidth(430));
    } else if (openDrawerLeftWidth === 430 || openDrawerLeftWidth === 800) {
      dispatch(appStateActions.setDrawerLeftWidth(64));
      dispatch(appStateActions.selectAssetObject({}));
    }
  };

  // Selected Asset Object
  type selectedAssetObject = any;
  const selectedAssetObject: selectedAssetObject = useAppSelector((state: any) => state.appState.selectedAssetObject);

  const handleDeselectAssetObject = () => {
    dispatch(appStateActions.selectAssetObject({}));
    dispatch(appStateActions.setDrawerLeftWidth(430));
  };

  // Menu links and menu link selection
  const menuLinkList = [
    {
      title: 'Nodes',
      icon: CategoryIcon,
      pane: 'nodeList'
    },
    {
      title: 'Scenes',
      icon: ImageIcon,
      pane: 'sceneList'
    },
    {
      title: 'Settings',
      icon: SettingsIcon,
      pane: 'settings'
    },
  ]

  const handleSelectMenuLink = (selectedLink: string) => {
    setSelected(selectedLink);
    if (openDrawerLeftState === false) {
      dispatch(appStateActions.toggleDrawerLeft());
    }
    dispatch(appStateActions.setDrawerLeftWidth(430));
    dispatch(appStateActions.selectAssetObject({}));
  };

  // Component display switching
  const menuItemMatchesComponent = (pane: string) => selected === pane;

  return (
    <Drawer variant="permanent" open={openDrawerLeftState}
      sx={{
        '& > .MuiDrawer-paper': {
          border: 'none'
        },
        ...(openDrawerLeftState === true && {
          transition: 'width .4s',
          width: openDrawerLeftWidth,
          '& .MuiDrawer-paper': {
            transition: 'width .4s',
            width: openDrawerLeftWidth
          }
        }),
        ...(openDrawerLeftState === false && {
          transition: 'width .4s',
          width: '64px',
          '& .MuiDrawer-paper': {
            transition: 'width .4s',
            width: '64px'
          }
        })
      }}
    >
      <Box sx={{ display: 'flex', height: '100%', marginTop: '64px', alignItems: 'stretch' }}>
        <Box sx={{ display: 'flex', height: '100%', backgroundColor: COLORS.colorLightgray3 }}>
          <List sx={{ p: 0 }}>
            {/* Hamburger menu icon to open and close Drawer */}
            <ListItem key={uuidv4()} disablePadding>
              <ListItemButton
                sx={{
                  minHeight: 64,
                  px: 2.5,
                  backgroundColor: '#E3B180',
                  '&.Mui-selected': {
                    backgroundColor: `${COLORS.colorSecondary} !important`
                  },
                  '&.Mui-focusVisible': {
                    backgroundColor: `${COLORS.colorSecondary} !important`
                  },
                  '&:hover': {
                    backgroundColor: `${COLORS.colorSecondary} !important`
                  }
                }}
                onClick={handleToggleOpenDrawerLeft}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {openDrawerLeftState ? <MenuOpenIcon /> : <MenuIcon />}
                </ListItemIcon>
              </ListItemButton>
            </ListItem>

            {/* Drawer Menu link list */}
            {menuLinkList.map((menuLinkItem, index) => {
              const MenuLinkItemIcon = menuLinkItem.icon;
              return (
                <ListItem key={uuidv4()} disablePadding>
                  <ListItemButton
                    sx={{
                      minHeight: 64,
                      px: 2.5,
                      '&.Mui-selected': {
                        backgroundColor: `${COLORS.colorListSelectDarkGray} !important`
                      },
                      '&.Mui-focusVisible': {
                        backgroundColor: `${COLORS.colorListSelectDarkGray} !important`
                      },
                      '&:hover': {
                        backgroundColor: `${COLORS.colorListSelectDarkGray} !important`
                      }
                    }}
                    selected={menuItemMatchesComponent(menuLinkItem.pane)}
                    onClick={() => handleSelectMenuLink(menuLinkItem.pane)}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: 'auto',
                        justifyContent: 'center',
                      }}
                    >
                      <MenuLinkItemIcon />
                    </ListItemIcon>
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </Box>
        <Box sx={{ display: 'flex', height: '100%', flex: '1 0', flexDirection: 'column', overflowX: 'hidden', backgroundColor: COLORS.colorLightgray }}>
          <Box sx={{ flex: '1, 1, auto', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '16px' }}>
            <Typography
              variant="h3"
              sx={{
                alignItems: 'center',
                padding: '5px 0px'
              }}
            >
              {selected === 'nodeList' && (Object.keys(selectedAssetObject).length === 0) ? 'Nodes'
                : selected === 'sceneList' ? 'Scenes'
                : selected === 'settings' ? 'Settings'
                : `Node ${selectedAssetObject.id}`
              }
              {(Object.keys(selectedAssetObject).length !== 0) && 
                <span
                  style={{
                    marginLeft: '8px',
                    paddingLeft: '8px',
                    borderLeft: `1px solid ${COLORS.colorDarkgray2}`
                  }}
                >
                  { selectedAssetObject.properties.name }
                </span>
              }
            </Typography>
            <Tooltip title={
              selected === 'nodeList' ? 'View scene asset/object information. Select and Highlight objects. Show on Graph. View Data.'
              : selected === 'sceneList' ? 'View and change Scenes'
              : selected === 'settings' ? 'View and edit Settings'
              : null
            }>
              <InfoIcon
                sx={{
                  fill: COLORS.colorDarkgray2,
                  marginLeft: '10px',
                  marginRight: '10px',
                  height: '15px',
                  width: '15px'
                }}
              />
            </Tooltip>
            {(selected === 'nodeList' && (Object.keys(selectedAssetObject).length === 0)) &&
              <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            }
            {(selected === 'nodeList' && (Object.keys(selectedAssetObject).length !== 0)) &&
              // <Box sx={{ flex: '1, 1, auto', display: 'flex', flexDirection: 'row', alignItems: 'center', margin: '12px 0px 12px auto' }}>
              <Box sx={{ position: 'absolute', right: '0px', paddingRight: '16px' }}>
                <ButtonIconText text='Back To List' handleClick={() => handleDeselectAssetObject()} type="close" color="error" />
              </Box>
            }
          </Box>
          {selected === 'nodeList' && 
            <>
              {(Object.keys(selectedAssetObject).length === 0) && <DrawerContentsNodeList data={nodes} />}
              {(Object.keys(selectedAssetObject).length !== 0) && <DrawerContentsNodeInfo />}
            </>
          }
          {selected === 'sceneList' && 
            <DrawerContentsSceneList />
          }
          {selected === 'settings' && 
            <DrawerContentsSettings />
          }
        </Box>
      </Box>
    </Drawer>
  );
}

export default DrawerLeft;
