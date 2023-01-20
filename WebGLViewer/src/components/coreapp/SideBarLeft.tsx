import * as React from 'react';
import { useState } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import InfoIcon from '@mui/icons-material/Info';
import SearchIcon from '@mui/icons-material/Search';

import SearchBar from '@mkyy/mui-search-bar';

import MetadataPanels from '../display/MetadataPanels';

import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../styles/variables';

export default function PersistentDrawerLeft(props: any) {
  const { children } = props;

  const theme = useTheme();
  const [open, setOpen] = React.useState(true);

  const handleDrawerOpenState = () => {
    setOpen(state => !state);
  };

  const [searchStr, setSearchStr] = useState('');
  const handleSearch = () => {
      if (searchStr) props.history.push(`/list/${searchStr.split(' ').join(':')}`);
      else props.history.push('/');
  }

  const assetList = [
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
    }
  ]

  return (
    <Box sx={{ height: '100%' }}>
      <Box sx={{ height: '45%' }}>
        <Typography
          variant="h3"
          sx={{
            padding: '16px 16px 0px 16px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          Assets
          <InfoIcon sx={{ fill: COLORS.colorDarkgray2, marginLeft: '10px', height: '15px', width: '15px' }} />
          <SearchBar
            value={searchStr}
            onChange={newValue => setSearchStr(newValue)}
            onSearch={handleSearch}
            style={{ marginLeft: '10px' }}
          />         
        </Typography>
        <List dense sx={{ borderTop: `1px solid ${COLORS.colorDarkgray}`, paddingTop: '0', marginTop: '12px' }}>
          {assetList.map((object, index) => (
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
      <Box sx={{ borderTop: `1px solid ${COLORS.colorDarkgray}`, padding: '16px 16px 0', height: '55%', backgroundColor: COLORS.colorLightgray3 }}>
        <Typography
          variant="h3"
          sx={{

          }}
        >
          Asset Information
        </Typography>
        <Typography
          sx={{

          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'row' }}>
            <Box sx={{ borderRight: `1px solid ${COLORS.colorDarkgray2}`, paddingRight: '5px', marginRight: '5px' }}>
              { assetList[0].id }
            </Box>
            <Box>
              { assetList[0].title }
            </Box>
          </Box>
        </Typography>
        <Box sx={{ marginTop: '8px', marginBottom: '12px' }}>
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

        <Box>
          <MetadataPanels />
        </Box>
      </Box>
      
    </Box>
  )
}
