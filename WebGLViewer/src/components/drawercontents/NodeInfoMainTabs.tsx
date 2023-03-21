import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// Custom Components 
import NodeInfoDetailsHistory from '../drawercontents/nodeinfo/NodeInfoDetailsHistory';
import NodeInfoPropsMeta from '../drawercontents/nodeinfo/NodeInfoPropsMeta';
import NodeInfoTimeSeries from '../drawercontents/nodeinfo/NodeInfoTimeSeries';
import NodeInfoNearbyNodes from '../drawercontents/nodeinfo/NodeInfoNearbyNodes';
import NodeInfoFiles from '../drawercontents/nodeinfo/NodeInfoFiles';
import NodeInfoTags from '../drawercontents/nodeinfo/NodeInfoTags';

interface TabPanelProps {
  index: number;
  value: number;
  data: any
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

type Props = {
  data: object;
};

const NodeInfoMainTabs: React.FC<Props> = ({
  data
}) => {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const tabInfo = [
    {
      title: 'Node Information',
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
      title: 'Nearby Nodes',
      component: NodeInfoNearbyNodes
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
  console.log(data)

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          sx={{
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
                  border: '1px solid #e9e9e9',
                  '&:not(:first-of-type)': {
                    marginLeft: -1,
                  },
                  background: '#f7f7f7',
                  opacity: 1,
                  '&.Mui-selected': {
                    borderBottomWidth: 0,
                    background: '#ffffff',
                    '& $wrapper': {
                      opacity: 1,
                    },
                  },
                  '& $wrapper': {
                    opacity: 0.5,
                  },
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
              <Box sx={{ p: 0, background: '#ffffff', display: 'flex', flex: '1 0 100%', flexDirection: 'column', marginTop: '-1px', padding: '16px' }}>
                <DynamicTag data={data} />
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  );
}

export default NodeInfoMainTabs;
