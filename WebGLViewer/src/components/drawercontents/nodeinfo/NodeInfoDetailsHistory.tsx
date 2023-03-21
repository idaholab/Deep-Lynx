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

  const nodeDetails = {id: data.id, ...data.details}
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
            // Create spaces at captials
            key = key.replace(/([A-Z])/g, ' $1').trim();
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
                <Typography>{ value.toString() }</Typography>
              </Grid>
            )
          })}
        </Grid>

        <InfoHeader>
          History
        </InfoHeader>

        <Timeline data={nodeHistory} />
      </Box>

    </>
  );
}

export default NodeInfoDetailsHistory;
