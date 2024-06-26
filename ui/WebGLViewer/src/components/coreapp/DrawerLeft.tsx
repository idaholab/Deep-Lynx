// React
import * as React from 'react';
// Hooks
import { useState, useEffect } from 'react';
import { useGetAllNodesQuery } from '../../../app/services/nodesDataApi';
import { useGetAllSessionsQuery } from '../../../app/services/sessionsDataApi';
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import { v4 as uuidv4 } from 'uuid';

// Import Redux Actions
import { appStateActions } from '../../../app/store/index';

// Material
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
import GroupIcon from '@mui/icons-material/Group';

// Components
import DrawerContentsNodeList from '../drawercontents/DrawerContentsNodeList';
import DrawerContentsNodeInfo from '../drawercontents/DrawerContentsNodeInfo';
import DrawerContentsSceneList from '../drawercontents/DrawerContentsSceneList';
import DrawerContentsSettings from '../drawercontents/DrawerContentsSettings';
import DrawerContentsSessionList from '../drawercontents/DrawerContentsSessionList';
import DrawerContentsSessionInfo from '../drawercontents/DrawerContentsSessionInfo';
import ButtonIconText from '../elements/ButtonIconText';

// Styles
import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../../src/styles/variables';

const queryFilterData = (query: any, data: any) => {
  if (!query) {
    return data;
  } else {
    return data.filter((d: any) => d.properties?.name.toString().toLowerCase().includes(query.toString().toLowerCase()));
  }
};

const SearchBar = ({ searchQuery, setSearchQuery, nodesData }: any) => (
  <FormControl fullWidth variant="outlined" size="small">
    <OutlinedInput
      id="search-bar"
      className="text"
      value={searchQuery}
      onInput={(event: React.ChangeEvent<HTMLInputElement>) => {
        const target = event.target as HTMLInputElement;
        if (target) setSearchQuery(target.value);
      }}
      aria-describedby="outlined-search-assets"
      inputProps={{
        'aria-label': 'search assets',
      }}
      placeholder="Search..."
      disabled={nodesData && nodesData.length > 0 ? false : true}
    />
  </FormControl>
);

type Props = {};


const DrawerLeft: React.FC<Props> = ({}) => {

  // Store
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

  // Selected Asset Object
  const selectedAssetObject: any = useAppSelector((state: any) => state.appState.selectedAssetObject);
  const selectedSessionObject: any = useAppSelector((state: any) => state.appState.selectedSessionObject);

  const [selected, setSelected] = useState('nodeList');
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggleOpenDrawerLeft = () => {
    dispatch(appStateActions.toggleDrawerLeft());
    if (openDrawerLeftWidth === 64) {
      dispatch(appStateActions.setDrawerLeftWidth(430));
    } else if (openDrawerLeftWidth === 430 || openDrawerLeftWidth === 800) {
      dispatch(appStateActions.setDrawerLeftWidth(64));
      dispatch(appStateActions.selectAssetObject({}));
    }
  };

  const handleDeselectAssetObject = () => {
    dispatch(appStateActions.selectAssetObject({}));
    dispatch(appStateActions.setDrawerLeftWidth(430));
  };

  const handleDeselectSessionObject = () => {
    dispatch(appStateActions.selectSessionObject({}));
    dispatch(appStateActions.setDrawerLeftWidth(430));
  };

  // Menu links and menu link selection
  const menuLinkList = [
    {
      title: 'Objects',
      icon: CategoryIcon,
      pane: 'nodeList'
    },
    {
      title: 'Scenes',
      icon: ImageIcon,
      pane: 'sceneList'
    },
    {
      title: 'Sessions',
      icon: GroupIcon,
      pane: 'sessionList'
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
    dispatch(appStateActions.selectSessionObject({}));
  };

  // Component display switching
  const menuItemMatchesComponent = (pane: string) => selected === pane;

  const { data: nodesDataResponse, isLoading: isLoadingNodesData } = useGetAllNodesQuery(
    {
      host, 
      token,
      container,
      tagId
    },
    {
      skip: !tagId, // Skip the query if tagId is not set
    }
  );

  const nodesData = nodesDataResponse?.value || [];
  const filteredNodesData = queryFilterData(searchQuery, nodesData);

  const { data: sessionsDataResponse, isLoading: isLoadingSessionsData } = useGetAllSessionsQuery(
    {
      host, 
      token,
      container,
    },
  );

  let sessionsData: any;

  if (sessionsDataResponse?.value) {
    try {
      sessionsData = JSON.parse(sessionsDataResponse.value);
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  }

  return (
    <>
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
        <Box sx={{ display: 'flex', height: '100%', paddingTop: '64px', alignItems: 'stretch' }}>
          <Box sx={{ display: 'flex', height: '100%', backgroundColor: COLORS.colorLightgray3 }}>
            <List sx={{ p: 0 }}>
              {/* Hamburger menu icon to open and close Drawer */}
              <ListItem key={uuidv4()} disablePadding>
                <ListItemButton
                  sx={{
                    minHeight: 64,
                    px: 2.5,
                    backgroundColor: `${COLORS.colorPrimary}`,
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
                {selected === 'nodeList' && (Object.keys(selectedAssetObject).length === 0) ? 'Objects'
                  : selected === 'sceneList' ? 'Scenes'
                  : selected === 'settings' ? 'Settings'
                  : selected === 'sessionList' && (Object.keys(selectedAssetObject).length === 0) ? 'Sessions'
                  : selected === 'sessionList' && (Object.keys(selectedAssetObject).length !== 0) ?  `Session ${selectedAssetObject.id}`
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
                : selected === 'sessionList' ? 'View and edit Sessions'
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
                <SearchBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  nodesData={nodesData}
                />
              }
              {(selected === 'nodeList' && (Object.keys(selectedAssetObject).length !== 0)) &&
                <Box sx={{ position: 'absolute', right: '0px', paddingRight: '16px' }}>
                  <ButtonIconText text='Back To List' handleClick={() => handleDeselectAssetObject()} type="close" color="error" />
                </Box>
              }
              {(selected === 'sessionList' && (Object.keys(selectedSessionObject).length !== 0)) &&
                <Box sx={{ position: 'absolute', right: '0px', paddingRight: '16px' }}>
                  <ButtonIconText text='Back To List' handleClick={() => handleDeselectSessionObject()} type="close" color="error" />
                </Box>
              }
            </Box>
            {selected === 'nodeList' && 
              <>
                {(Object.keys(selectedAssetObject).length === 0) && 
                  <DrawerContentsNodeList
                    filteredData={filteredNodesData}
                    initialData={nodesData}
                    isLoading={isLoadingNodesData}
                  />
                }
                {(Object.keys(selectedAssetObject).length !== 0) && <DrawerContentsNodeInfo />}
              </>
            }
            {selected === 'sceneList' && 
              <DrawerContentsSceneList />
            }
            {selected === 'settings' && 
              <DrawerContentsSettings />
            }
            {selected === 'sessionList' && 
              <>
                {(Object.keys(selectedSessionObject).length === 0) &&
                  <DrawerContentsSessionList
                    data={sessionsData}
                    isLoading={isLoadingSessionsData}
                  />
                }
                {(Object.keys(selectedSessionObject).length !== 0) && <DrawerContentsSessionInfo />}
              </>
            }
          </Box>
        </Box>
      </Drawer>
    </>
  );
}

export default DrawerLeft;
