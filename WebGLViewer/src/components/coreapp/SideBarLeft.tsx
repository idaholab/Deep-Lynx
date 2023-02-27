import * as React from 'react';
import { useState } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { useAppSelector, useAppDispatch } from '../../../app/hooks/hooks';
import classNames from 'classnames';

// Import Redux actions
import { appStateActions } from '../../../app/store/index';

// Import MUI components
import {
  Box,
  Button,
  FormControl,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  OutlinedInput,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';

// Import Icons
import InfoIcon from '@mui/icons-material/Info';

// Import custom components
import MetadataPanels from '../display/MetadataPanels';

// Import styles
import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../styles/variables';


const filterData = (query: any, data: any) => {
  if (!query) {
    return data;
  } else {
    return data.filter((d: any) => d.title.toString().toLowerCase().includes(query.toString().toLowerCase()));
  }
};

const SearchBar = ({setSearchQuery}: any) => (
  <FormControl fullWidth sx={{ mr: 2 }} variant="outlined" size="small">
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

export default function PersistentDrawerLeft(props: any) {
  const { children } = props;

  const theme = useTheme();

  const dispatch = useAppDispatch();

  const [searchQuery, setSearchQuery] = useState("");

  const [selected, setSelected] = React.useState<string | false>(false);

  type selectedAssetObject = any;
  const selectedAssetObject: selectedAssetObject = useAppSelector((state: any) => state.appState.selectedAssetObject);
  const handleSelectAssetObject = (obj: any, selectedItem: string) => {
    dispatch(appStateActions.selectAssetObject(obj));
    setSelected(selectedItem);
  };

  type selectAssetOnScene = string;
  const selectAssetOnScene: selectAssetOnScene = useAppSelector((state: any) => state.appState.selectAssetOnScene);
  const handleSelectAssetOnScene = (payload: string) => {
    dispatch(appStateActions.selectAssetOnScene(payload))
  };

  type highlightAssetOnScene = string;
  const highlightAssetOnScene: highlightAssetOnScene = useAppSelector((state: any) => state.appState.highlightAssetOnScene);
  const handleHighlightAssetOnScene = (payload: string) => {
    dispatch(appStateActions.highlightAssetOnScene(payload))
  };

  const handleShowAssetOnGraph = (payload: string) => {
    console.log('Action to \"Show On Graph\" clicked!')
  }

  const handleToggleDataView = (payload: string) => {
    dispatch(appStateActions.setDataViewObject(payload));
    dispatch(appStateActions.toggleDrawerRight())
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column', overflow: 'hidden' }}>
      <Box
        sx={{ display: 'flex', flexDirection: 'column', padding: '16px 0px 0', overflowX: 'hidden', }}
        className={classNames(
          'sidebar-sizing',
          {
            'sidebar-sizing-asset-selected': Object.keys(selectedAssetObject).length !== 0,
          },
        )}
      >

        {/* <Box sx={{ flex: '1, 1, auto', display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '12px' }}>
          <Typography
            variant="h3"
            sx={{
              alignItems: 'center',
              padding: '0 0 0 16px'
            }}
          >
            Assets
          </Typography>
          <Tooltip title="View scene asset/object information. Select and Highlight objects. Show on Graph. View Data.">
            <InfoIcon sx={{ fill: COLORS.colorDarkgray2, marginLeft: '10px', marginRight: '10px', height: '15px', width: '15px' }} />
          </Tooltip>
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'row', fontSize: '14px', padding: '0px 10px 6px' }}>
          <Box sx={{ borderRight: `1px solid ${COLORS.colorDarkgray2}`, paddingRight: '6px', marginRight: '6px' }}>
            Id
          </Box>
          <Box sx={{ maxWidth: '165px', overflow: 'hidden', position: 'relative', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Title
          </Box>
        </Box> */}
        <Box sx={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: '0', borderTop: `1px solid ${COLORS.colorDarkgray}` }}>
          {/* <List dense sx={{ paddingTop: '0' }}>
            {dataFiltered.map((object: any, index: number) => (
              <ListItem
                key={object.id}
                disablePadding
                sx={{ borderBottom: `1px solid ${COLORS.colorDarkgray}` }}
                secondaryAction={
                  <Stack spacing={.5} direction="row">
                    <Button
                      variant="contained"
                      size="small"
                      sx={{
                        height: '25px',
                        width: '25px',
                        padding: '4px',
                        minWidth: '25px',
                        '& span': {
                          fontSize: '18px'
                        }
                      }}
                      onClick={() => {
                        handleSelectAssetOnScene(object.title)
                      }}
                    >
                      <span className="material-symbols-rounded">
                        ads_click
                      </span>
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      sx={{
                        height: '25px',
                        width: '25px',
                        padding: '4px',
                        minWidth: '25px',
                        '& span': {
                          fontSize: '18px'
                        }
                      }}
                      onClick={() => {
                        handleHighlightAssetOnScene(object.title)
                      }}
                    >
                      <span className="material-symbols-rounded">
                        highlight
                      </span>
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      sx={{
                        height: '25px',
                        width: '25px',
                        padding: '4px',
                        minWidth: '25px',
                        '& span': {
                          fontSize: '16px'
                        }
                      }}
                      onClick={() => {
                        handleShowAssetOnGraph(object)
                      }}
                    >
                      <span className="material-symbols-rounded">
                        hub
                      </span>
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      sx={{
                        height: '25px',
                        width: '25px',
                        padding: '4px',
                        minWidth: '25px',
                        '& span': {
                          fontSize: '18px'
                        }
                      }}
                      onClick={() => {
                        handleToggleDataView(object)
                      }}
                    >
                      <span className="material-symbols-rounded">
                        show_chart
                      </span>
                    </Button>
                  </Stack>
                }
              >
                <ListItemButton
                  onClick={() => handleSelectAssetObject(object, `listItem${index+1}`)}
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
                        { object.title }
                      </Box>
                    </Box>
                  </ListItemText>
                </ListItemButton>
              </ListItem>
            ))}
          </List> */}
        </Box>
      </Box>
      {Object.keys(selectedAssetObject).length !== 0 && 
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: '0 50%',
            borderTop: `1px solid ${COLORS.colorDarkgray}`,
            padding: '16px 0px 0px 16px',
            backgroundColor: COLORS.colorLightgray3,
            overflow: 'hidden'
          }}
        >
          <Box sx={{  }}>
            <Typography
              variant="h3"
              sx={{  }}
            >
              Asset Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
              <Typography sx={{ borderRight: `1px solid ${COLORS.colorDarkgray2}`, paddingRight: '5px', marginRight: '5px' }}>
                { selectedAssetObject.id }
              </Typography>
              <Typography>
                { selectedAssetObject.title }
              </Typography>
            </Box>
            <Box sx={{ marginTop: '8px', marginBottom: '16px' }}>
              <Stack sx={{ marginBottom: '8px' }} spacing={.5} direction="row">
                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    height: '25px',
                    padding: '4px 8px 4px 4px',
                    minWidth: '25px',
                    color: 'white',
                    '& span': {
                      fontSize: '16px'
                    }
                  }}
                  onClick={() => {
                    handleSelectAssetOnScene(selectedAssetObject.title)
                  }}
                >
                  <span className="material-symbols-rounded" style={{ marginRight: '5px' }}>
                    ads_click
                  </span>
                  Select on Scene
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    height: '25px',
                    padding: '4px 8px 4px 4px',
                    minWidth: '25px',
                    color: 'white',
                    '& span': {
                      fontSize: '16px'
                    }
                  }}
                  onClick={() => {
                    handleHighlightAssetOnScene(selectedAssetObject.title)
                  }}
                >
                  <span className="material-symbols-rounded" style={{ marginRight: '5px' }}>
                    highlight
                  </span>
                  Highlight on Scene
                </Button>
              </Stack>
              <Stack spacing={.5} direction="row">
                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    height: '25px',
                    padding: '4px 8px 4px 4px',
                    minWidth: '25px',
                    color: 'white',
                    '& span': {
                      fontSize: '16px'
                    }
                  }}
                  onClick={() => {
                    handleShowAssetOnGraph(selectedAssetObject)
                  }}
                >
                  <span className="material-symbols-rounded" style={{ marginRight: '5px' }}>
                    hub
                  </span>
                  Show on Graph
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    height: '25px',
                    padding: '4px 8px 4px 4px',
                    minWidth: '25px',
                    color: 'white',
                    '& span': {
                      fontSize: '16px'
                    }
                  }}
                  onClick={() => {
                    handleHighlightAssetOnScene(selectedAssetObject)
                  }}
                >
                  <span className="material-symbols-rounded" style={{ marginRight: '5px' }}>
                    show_chart
                  </span>
                  Toggle Data View
                </Button>
              </Stack>
            </Box>
          </Box>      
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'scroll', padding: '0px 16px 20px 0px' }}>
            <MetadataPanels />
          </Box>
        </Box>
      }
    </Box>
  )
}
