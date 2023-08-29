// React
import * as React from 'react';

// Hooks
import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Import Redux Actions
import { appStateActions } from '../../../app/store/index';

// MUI Components
import {
  Box,
  FormControl,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  OutlinedInput,
  Typography
} from '@mui/material';

// Styles
import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../styles/variables';

// Custom Components
import LoadingProgress from '../elements/LoadingProgress';

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


type Props = {};

const DrawerContentsSceneList: React.FC<Props> = ({}) => {

  const dispatch = useAppDispatch();

  const sceneList : string[] = useAppSelector((state: any) => state.appState.sceneList);
  const openDrawerLeftState: boolean = useAppSelector((state: any) => state.appState.openDrawerLeft);
  const openDrawerLeftWidth: number = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  const [searchQuery, setSearchQuery] = useState("");

  const [selected, setSelected] = React.useState<string | false>(false);

  const selectedSceneObject: any = useAppSelector((state: any) => state.appState.selectedSceneObject);
  const handleSelectScene = (scene: string) => {
    dispatch(appStateActions.selectSceneObject(scene));
    setSelected(scene);
  };

  return (
    <>
      <Box sx={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: '0', borderTop: `1px solid ${COLORS.colorDarkgray}` }}>
        <>
          {!sceneList || sceneList.length === 0 ? (
            <Typography align="center" sx={{ margin: '8px 0', fontSize: '14px' }}>
              No Scenes to display
            </Typography>
          ) :(
            <>
              <List dense sx={{ paddingTop: '0' }}>
                {sceneList.map((scene: string, index: number) => (
                  <ListItem
                    key={index}
                    disablePadding
                    sx={{ borderBottom: `1px solid ${COLORS.colorDarkgray}` }}
                  >
                    <ListItemButton
                      onClick={() => handleSelectScene(scene)}
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
                            { 
                              scene ? (
                                scene.split("/").pop()
                              ) : null
                            }
                          </Box>
                        </Box>
                      </ListItemText>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </>
      </Box>
    </>
  );
}

export default DrawerContentsSceneList;
