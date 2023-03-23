// React
import * as React from 'react';

// MUI Components
import {
  Box,
  Grid,
  Typography
} from '@mui/material';

// Styles
import '../../../styles/App.scss';
// @ts-ignore
import COLORS from '../../../styles/variables';

// Custom Components 
import InfoHeader from '../../elements/InfoHeader';
import Timeline from '../../display/Timeline';

type Props = {
  data: any
};

const NodeInfoDetailsHistory: React.FC<Props> = ({
  data
}) => {

  const nodeDetails = {id: data.id, metatype_name: data.metatype_name, data_source_id: data.data_source_id, created_at: data.created_at, modified_at: data.modified_at,}
  const nodeHistory = data.history;

  return (
    <>
      <Box sx={{ display: 'block', width: '100%'}}>
        <InfoHeader>
          Details
        </InfoHeader>
        <Grid container spacing={2} sx={{ marginBottom: '28px' }}>
          {Object.entries(nodeDetails).map(([key, value]) => {
            // Capitalize first letter of key
            key = key.charAt(0).toUpperCase() + key.slice(1);

            // Create spaces and capitals at underscores
            key = key.replace(/(?:_| |\b)(\w)/g, function($1){return $1.toUpperCase().replace('_',' ');});
            return (
              <Grid item xs={6} lg={4} key={key}>
                <Typography
                  sx={{
                    fontWeight: 'bold'
                  }}
                >
                  { key }
                </Typography>
                {/* @ts-ignore */}
                {value !== null 
                  ? (
                    <Typography>{ value.toString() }</Typography>
                  ) : (
                    <Typography>N/A</Typography>
                  )
                }      
              </Grid>
            )
          })}
        </Grid>

        <InfoHeader>
          History
        </InfoHeader>

        {/* <Timeline data={nodeHistory} /> */}
      </Box>

    </>
  );
}

export default NodeInfoDetailsHistory;
