// React
import * as React from 'react';

// Hooks
import { useState, useEffect } from 'react';
import { useAppSelector } from '../../../../app/hooks/reduxTypescriptHooks';

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
  const nodeId = data.id;

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
      id: data.id,
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

  const containerId = useAppSelector((state: any) => state.appState.containerId);

  useEffect(() => {
    async function getNodeHistory() {
      // const token = localStorage.getItem('user.token');
      const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNlcnZpY2UiLCJkaXNwbGF5X25hbWUiOiJXZWJHTCIsImVtYWlsIjoiIiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJ1c2VyX2lkIjoiMyIsImtleSI6Ik16RXdaalpqWVRndFpURmlaaTAwTkRneExXRTBNbVV0T1dVMFpEUXdNelV6TldRNSIsInNlY3JldCI6IiQyYSQxMCRnbGlFdG02RWV2ZlRmQmllN20xMmRPLjdVY2lsLnIyc2tMNjhhN3JFdEV2OWNuQWdkZEVTLiIsIm5vdGUiOm51bGwsImlkIjoiMyIsImlkZW50aXR5X3Byb3ZpZGVyX2lkIjpudWxsLCJjcmVhdGVkX2F0IjoiMjAyMy0wNC0wNlQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIzLTA0LTA2VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5IjoiMiIsIm1vZGlmaWVkX2J5IjoiMiIsInJlc2V0X3Rva2VuX2lzc3VlZCI6bnVsbCwiaWF0IjoxNjgwODEyMDA0LCJleHAiOjE3MTIzNjk2MDR9.fBFpQcdnDNc4zZ1AIReBkcY89EM8Ri7kQcQ10gnOubnM19e865D3ipZeUen4O_Jd5elJsfjwNyeW_DCJgof78A";

      await axios.get( `http://localhost:8090/containers/${containerId}/graphs/nodes/${nodeId}/`,
        {
          params: { history: 'true' },
          headers: {
            Authorization: `bearer ${token}`
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
