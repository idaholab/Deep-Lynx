import * as React from 'react';
import { useState } from 'react';
import { styled, useTheme } from '@mui/material/styles';

import { Box, Button, FormControl, InputAdornment, FormHelperText, OutlinedInput, Stack, TextField, Typography, List, ListItem, ListItemText, ListItemButton } from '@mui/material';

import InfoIcon from '@mui/icons-material/Info';

import MetadataPanels from '../display/MetadataPanels';

import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../styles/variables';

const data = [
  {
    id: 23425,
    title: 'Water Tower',
  },
  {
    id: 24633,
    title: 'Water Tower',
  },
  {
    id: 24951,
    title: 'Water Pump',
  },
  {
    id: 25439,
    title: 'Containment Building',
  },
  {
    id: 34567,
    title: 'Water Tower',
  },
  {
    id: 22335,
    title: 'Water Tower',
  },
  {
    id: 46457,
    title: 'Water Pump',
  },
  {
    id: 64333,
    title: 'Containment Building',
  },
  {
    id: 77456,
    title: 'Water Tower',
  },
  {
    id: 43322,
    title: 'Water Tower',
  },
  {
    id: 22222,
    title: 'Water Pump',
  },
  {
    id: 75532,
    title: 'Containment Building',
  }
]

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
  const [open, setOpen] = React.useState(true);

  const handleDrawerOpenState = () => {
    setOpen(state => !state);
  };

  const [searchQuery, setSearchQuery] = useState("");
  const dataFiltered = filterData(searchQuery, data);

  return (
    <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: '1, 1, auto', height: '50%', minHeight: '0', padding: '16px 0px 0' }}>
        <Box sx={{ flex: '1, 1, auto', display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '12px' }}>
          <Typography
            variant="h3"
            sx={{
              alignItems: 'center',
              padding: '0 0 0 16px'
            }}
          >
            Assets
          </Typography>
          <InfoIcon sx={{ fill: COLORS.colorDarkgray2, marginLeft: '10px', marginRight: '10px', height: '15px', width: '15px' }} />
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'scroll', padding: '0 ' }}>
          <List dense sx={{ borderTop: `1px solid ${COLORS.colorDarkgray}`, paddingTop: '0' }}>
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
                          fontSize: '16px'
                        }
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
                    >
                      <span className="material-symbols-rounded">
                        show_chart
                      </span>
                    </Button>
                  </Stack>
                }
              >
                <ListItemButton>
                  <ListItemText>
                    <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                      <Box sx={{ borderRight: `1px solid ${COLORS.colorDarkgray}`, paddingRight: '6px', marginRight: '6px' }}>
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
          </List>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: '1, 1, auto', height: '50%', minHeight: '0', borderTop: `1px solid ${COLORS.colorDarkgray}`, padding: '16px 0px 0px 16px',  backgroundColor: COLORS.colorLightgray3 }}>
        <Box sx={{ flex: '1, 1, auto' }}>
          <Typography
            variant="h3"
            sx={{

            }}
          >
            Asset Information
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'row' }}>
            <Typography sx={{ borderRight: `1px solid ${COLORS.colorDarkgray2}`, paddingRight: '5px', marginRight: '5px' }}>
              { dataFiltered[0].id }
            </Typography>
            <Typography>
              { dataFiltered[0].title }
            </Typography>
          </Box>
          <Box sx={{ marginTop: '8px', marginBottom: '16px' }}>
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
              >
                <span className="material-symbols-rounded" style={{ marginRight: '5px' }}>
                  show_chart
                </span>
                Data View
              </Button>
            </Stack>
          </Box>
        </Box>      
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'scroll', padding: '0px 16px 20px 0px' }}>
          <MetadataPanels />
        </Box>
      </Box>
    </Box>
  )
}
