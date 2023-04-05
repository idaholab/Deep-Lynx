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

  type containerId = Array<{ [key: string]: any; }>;
  const containerId = useAppSelector((state: any) => state.appState.containerId);

  useEffect(() => {
    async function getNodeHistory() {
      const token = "bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNhbWxfYWRmcyIsImRpc3BsYXlfbmFtZSI6IkFkYW0uUGx1dGhAaW5sLmdvdiIsImVtYWlsIjoiQWRhbS5QbHV0aEBpbmwuZ292IiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJ1c2VyX2lkIjoiNDIiLCJrZXkiOiJORGhsTldGa09ERXRObUUwT1MwME1EYzVMV0UwTVRBdE16Y3lOV05pTm1JeE1tUTAiLCJzZWNyZXQiOiIkMmEkMTAkYWdQTVVjRlNNOFlCUTNHTmNkblhVZXNyZ0dRaWF6ckVIRUlzTVZtcEtOb1lLaGF5NkRhaFMiLCJub3RlIjoiV2ViIEdMIFZpZXdlciIsImlkIjoiNDIiLCJpZGVudGl0eV9wcm92aWRlcl9pZCI6IkFkYW0uUGx1dGhAaW5sLmdvdiIsImNyZWF0ZWRfYXQiOiIyMDIzLTAzLTE1VDA2OjAwOjAwLjAwMFoiLCJtb2RpZmllZF9hdCI6IjIwMjMtMDMtMTVUMDY6MDA6MDAuMDAwWiIsImNyZWF0ZWRfYnkiOiJzYW1sLWFkZnMgbG9naW4iLCJtb2RpZmllZF9ieSI6InNhbWwtYWRmcyBsb2dpbiIsInJlc2V0X3Rva2VuX2lzc3VlZCI6bnVsbCwiaWF0IjoxNjgwNTUwNDkxLCJleHAiOjE2ODMxNDI0OTF9.Z7aAilgXj6wYzVoMRLIfy-flewG3D-WUUi11nZGtVnuVOSXeQryD_-tQNEMRaHuJzS5qsZUaEzece2xoeUHEzm9E506wQIbFBqv6EOPYqTeY8GnlwB83YEtUlKWnmDJ8wR3xwtW8TUPcvbydpiJsrEDGtFdSwaWE-EGySFGJg7snA3aBh7u_Nvt8jzuPXUzOK54Srb7ZaKo-x_h29CBYM_HM0MCLq7HEV2pAiI_c-t4-B-Wgt7MGibTtetmLr5T81ry3lpodeGoI62n3g2bdhALmUPIW_krQGRn-TaHyMgAhFdeZwk1IEvlBS3rf4fld8tDNFKWYHE-0fQ0FexB4qQ";
      // const token = localStorage.getItem('user.token');

      await axios.get( `https://deeplynx.azuredev.inl.gov/containers/${containerId}/graphs/nodes/${nodeId}/`,
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
                {/* {value !== null
                  ? (
                    <Typography>{ value.toString() }</Typography>
                  ) : (
                    <Typography>N/A</Typography>
                  )
                }       */}
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
