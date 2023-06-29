// React
import * as React from 'react';

// Hooks
import { useState } from 'react';
import { useGetNodeHistoryQuery } from '../../../../app/services/nodesDataApi';
import { useAppSelector } from '../../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import { DateTime } from 'luxon';

// MUI Components
import {
  Box,
  Grid,
  Typography
} from '@mui/material';

// Styles
import '../../../styles/App.scss';

// Custom Components 
import InfoHeader from '../../elements/InfoHeader';
import Timeline from '../../display/Timeline';

type Props = {
  selectedAssetObject: any
};

const NodeInfoDetailsHistory: React.FC<Props> = ({
  selectedAssetObject
}) => {
  // DeepLynx
  const host: string = useAppSelector((state: any) => state.appState.host);
  const container: string = useAppSelector((state: any) => state.appState.container);
  const nodeData = selectedAssetObject;
  const nodeId = selectedAssetObject.id;

  const [nodeDetails, setNodeDetails] = useState(()=> {
    const isValidDate = (datetime: any) => {
      if (DateTime.fromISO(datetime).isValid === true) {
        return (
          `
          ${DateTime.fromISO(datetime).toLocaleString(DateTime.DATE_SHORT)}, 
          ${DateTime.fromISO(datetime).toLocaleString(DateTime.TIME_WITH_SHORT_OFFSET)}
          `
        )
      } else {
        return 'N/A'
      }
    }
    let nodeDetailsList = {
      id: selectedAssetObject.id,
      metatype_name: selectedAssetObject.metatype_name,
      data_source_id: selectedAssetObject.data_source_id,
      created_at: isValidDate(nodeData.created_at),
      modified_at: isValidDate(nodeData.modified_at),
    }
    return (
      nodeDetailsList
    )
  });

  const { data: response = [], isLoading } = useGetNodeHistoryQuery({ host, container, nodeId });

  let nodeHistory = [];

  if (!isLoading) {
    nodeHistory = response?.value
  }

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
                {value !== null && value !== undefined
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

        <Timeline data={nodeHistory} isLoading={isLoading} />
      </Box>

    </>
  );
}

export default NodeInfoDetailsHistory;
