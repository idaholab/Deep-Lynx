// React
import * as React from 'react';

// Hooks
import { useState, useEffect } from 'react';

// Import Packages
import axios from 'axios';
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
  data: any
};

const NodeInfoDetailsHistory: React.FC<Props> = ({
  data
}) => {
  const nodeData = data;

  const [nodeDetails, setNodeDetails] = useState(()=> {
    const isValidDate = (datetime: any) => {
      if (datetime !== null) {
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
      id: data.properties.id,
      metatype_name: data.metatype_name,
      data_source_id: data.data_source_id,
      created_at: isValidDate(nodeData.created_at),
      modified_at: isValidDate(nodeData.modified_at),
    }
    return (
      nodeDetailsList
    )
  });
  const [nodeHistory, setNodeHistory] = useState([]);

  useEffect(() => {
    async function getNodeHistory() {
      const files = JSON.parse(localStorage.getItem('node')!);
      const token = localStorage.getItem('user.token');
      // const token = "bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNhbWxfYWRmcyIsImRpc3BsYXlfbmFtZSI6Ik5hdGhhbiBMLiBXb29kcnVmZiIsImVtYWlsIjoiTmF0aGFuLldvb2RydWZmQGlubC5nb3YiLCJhZG1pbiI6ZmFsc2UsImFjdGl2ZSI6dHJ1ZSwicmVzZXRfcmVxdWlyZWQiOmZhbHNlLCJlbWFpbF92YWxpZCI6ZmFsc2UsInR5cGUiOiJ1c2VyIiwicGVybWlzc2lvbnMiOltdLCJyb2xlcyI6W10sInVzZXJfaWQiOiIxOSIsImtleSI6Ik16SXlNVFJoTm1JdE9EYzNNaTAwWWpjMExXRmxaRFF0TkdOaE16VmlOR0l6TVdaaiIsInNlY3JldCI6IiQyYSQxMCRJREg5WXpGM2RmeXVpNDA2ZVFVSWhPU3Y1djQ2czNMaTlGTERJVlc4a2NpeERnZThNclpiMiIsIm5vdGUiOiJBZGFtIiwiaWQiOiIxOSIsImlkZW50aXR5X3Byb3ZpZGVyX2lkIjoiTmF0aGFuLldvb2RydWZmQGlubC5nb3YiLCJjcmVhdGVkX2F0IjoiMjAyMi0wOC0xOFQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIyLTA4LTE4VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5Ijoic2FtbC1hZGZzIGxvZ2luIiwibW9kaWZpZWRfYnkiOiJzYW1sLWFkZnMgbG9naW4iLCJyZXNldF90b2tlbl9pc3N1ZWQiOm51bGwsImlhdCI6MTY3ODkxMzA5OCwiZXhwIjoxNzEwNDcwNjk4fQ.6ex5ftZOQlOEkCev-G54qPE2waN3HZeDsMpK4ssPa_fEamUhd7-qt56OcM87VUSMNEDRYVPw74WF9PhyBUf2n4EslunCUZLYYpW1RdrQViDcbi6zHPlfMe0KrRwTsu4YobAVEMvEYkpA_wW0u0O4YfemEZdrqORYxMONHfmqCC_tA4FODi5hrv9ln3xH3DpmUaVXlvRzzFvPH5bE-jKV_gdmeunkFyfVuE1wuUx7I0jF6ZpUj1u09bikdvTo-FmchkRRGyYKKsbu5H3DZsr7JoT_tAnS_Z5O9MBeHu8uqciAc2esElkq3t_cpxi5yLriIx5mSEI6b7Fb6UEClVP5XA";

      await axios.get( `${location.origin}/containers//graphs/nodes/90/`,
        {
          params: { history: 'true' },
          headers: {
            Authorization: token
          }
        }).then (
          (response: any) => {
            setNodeHistory(() => {
              const history = response.data.value;
              return (
                history
              )
            })
          }
        )
    }

    getNodeHistory();
  }, []);

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

        <Timeline data={nodeHistory} />
      </Box>

    </>
  );
}

export default NodeInfoDetailsHistory;
