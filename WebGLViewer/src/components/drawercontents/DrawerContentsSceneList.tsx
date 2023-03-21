// React
import * as React from 'react';

// Hooks
import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import classNames from 'classnames';

// Import Redux Actions
import { appStateActions } from '../../../app/store/index';

// MUI Styles
import { useTheme } from '@mui/material/styles';

// MUI Components
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

// MUI Icons
import InfoIcon from '@mui/icons-material/Info';

// Styles
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


export default function DrawerContentsNodeList(props: any) {
  const { children } = props;

  const theme = useTheme();
  const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  type tempSceneData = Array<{ [key: string]: any; }>;
  const tempSceneData = useAppSelector((state: any) => state.appState.tempSceneData);

  const [searchQuery, setSearchQuery] = useState("");
  const dataFiltered = filterData(searchQuery, tempSceneData);

  const [selected, setSelected] = React.useState<string | false>(false);

  type selectedSceneObject = any;
  const selectedSceneObject: selectedSceneObject = useAppSelector((state: any) => state.appState.selectedSceneObject);
  const handleSelectSceneObject = (obj: any, selectedItem: string) => {
    dispatch(appStateActions.selectSceneObject(obj));
    setSelected(selectedItem);
  };

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', padding: '16px 0px 0', overflowX: 'hidden', }}
      className={classNames(
        'drawer-left-sizing',
        {
          'drawer-left-sizing-asset-selected': Object.keys(selectedSceneObject).length !== 0,
        },
      )}
    >

      <Box sx={{ flex: '1, 1, auto', display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '12px' }}>
        <Typography
          variant="h3"
          sx={{
            alignItems: 'center',
            padding: '0 0 0 16px'
          }}
        >
          Scenes
        </Typography>
        <Tooltip title="View scene asset/object information. Select and Highlight objects. Show on Graph. View Data.">
          <InfoIcon sx={{ fill: COLORS.colorDarkgray2, marginLeft: '10px', marginRight: '10px', height: '15px', width: '15px' }} />
        </Tooltip>
        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: '0', borderTop: `1px solid ${COLORS.colorDarkgray}` }}>
        <List dense sx={{ paddingTop: '0' }}>
          {dataFiltered.map((item: any, index: number) => (
            <ListItem
              key={index}
              disablePadding
              sx={{ borderBottom: `1px solid ${COLORS.colorDarkgray}` }}
            >
              <ListItemButton
                onClick={() => handleSelectSceneObject(item, `listItem${index+1}`)}
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
                      { item }
                    </Box>
                  </Box>
                </ListItemText>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
}
