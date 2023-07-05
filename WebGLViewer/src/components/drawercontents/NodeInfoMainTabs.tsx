// React
import * as React from 'react';

// MUI Components
import {
  Box,
  Tab,
  Tabs
} from '@mui/material';

// Custom Components 
import NodeInfoDetailsHistory from '../drawercontents/nodeinfo/NodeInfoDetailsHistory';
import NodeInfoPropsMeta from '../drawercontents/nodeinfo/NodeInfoPropsMeta';
import NodeInfoTimeSeries from '../drawercontents/nodeinfo/NodeInfoTimeSeries';
import NodeInfoLinkedInformation from './nodeinfo/NodeInfoLinkedInformation';
import NodeInfoFiles from '../drawercontents/nodeinfo/NodeInfoFiles';
import NodeInfoTags from '../drawercontents/nodeinfo/NodeInfoTags';

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

type Props = {
  selectedAssetObject: object;
};

const NodeInfoMainTabs: React.FC<Props> = ({
  selectedAssetObject
}) => {
  console.log(data)
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const tabInfo = [
    {
      title: 'Info',
      component: NodeInfoDetailsHistory
    },
    {
      title: 'Properties/Metadata',
      component: NodeInfoPropsMeta
    },
    {
      title: 'Timeseries Data',
      component: NodeInfoTimeSeries
    },
    {
      title: 'Linked Info',
      component: NodeInfoLinkedInformation
    },
    {
      title: 'Attached Files',
      component: NodeInfoFiles
    },
    {
      title: 'Tags',
      component: NodeInfoTags
    },
  ]

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          sx={{
            minHeight: '36px',
            '& .MuiTabs-indicator': {
              display: 'none'
            }
          }}
          value={value} onChange={handleChange} aria-label="basic tabs example"
        >
          {tabInfo.map((obj, index) => {
            return (
              <Tab
                sx={{
                  minHeight: '36px',
                  border: '1px solid #e9e9e9',
                  '&:first-of-type': {
                    borderLeft: 'none'
                  },
                  padding: '4px 12px',
                  background: '#f7f7f7',
                  opacity: 1,
                  lineHeight: 0.85,
                  '&.Mui-selected': {
                    borderBottomWidth: 0,
                    background: 'white',
                    '& $wrapper': {
                      opacity: 1,
                    },
                  },
                  '& $wrapper': {
                    opacity: 0.4,
                  },
                  fontSize: '16px',
                  minWidth: '60px'
                }} 
                label={obj.title} {...a11yProps(index)} key={obj.title}
              />
            )
          })}
        </Tabs>
      </Box>
      {tabInfo.map((obj, index) => {
        let DynamicTag = obj.component;
        return (
          <Box
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            sx={{ display: 'flex', flex: '1 1 100%'}}
            key={index}
          >
            {value === index && (
              <Box sx={{ p: 0, background: 'white', display: 'flex', flex: '1 0 100%', flexDirection: 'column', marginTop: '-1px', padding: '16px' }}>
                <DynamicTag selectedAssetObject={selectedAssetObject} />
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  );
}

export default NodeInfoMainTabs;
