// React
import * as React from 'react';

// Hooks
import { useState, useEffect } from 'react';
import { useAppSelector } from '../../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import Plot from 'react-plotly.js';
import axios, { AxiosResponse } from 'axios';

// MUI Components
import {
  Button
} from '@mui/material';

// Styles
import '../../../styles/App.scss';
// @ts-ignore
import COLORS from '../../../styles/variables';

// Custom Components 
import InfoHeader from '../../elements/InfoHeader';
import ButtonIconText from '../../elements/ButtonIconText';
import DataTableBasic from '../../display/DataTableBasic';

type Props = {
  data: any
};

const NodeInfoTimeSeries: React.FC<Props> = ({
  data
}) => {
  const nodeId = data.id

  type containerId = Array<{ [key: string]: any; }>;
  const containerId = useAppSelector((state: any) => state.appState.containerId);

  const [tableRowData, setTableRowData] = useState(Array<{ [key: string]: any; }>);

  // const token = "bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNhbWxfYWRmcyIsImRpc3BsYXlfbmFtZSI6IkFkYW0uUGx1dGhAaW5sLmdvdiIsImVtYWlsIjoiQWRhbS5QbHV0aEBpbmwuZ292IiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJ1c2VyX2lkIjoiNDIiLCJrZXkiOiJORGhsTldGa09ERXRObUUwT1MwME1EYzVMV0UwTVRBdE16Y3lOV05pTm1JeE1tUTAiLCJzZWNyZXQiOiIkMmEkMTAkYWdQTVVjRlNNOFlCUTNHTmNkblhVZXNyZ0dRaWF6ckVIRUlzTVZtcEtOb1lLaGF5NkRhaFMiLCJub3RlIjoiV2ViIEdMIFZpZXdlciIsImlkIjoiNDIiLCJpZGVudGl0eV9wcm92aWRlcl9pZCI6IkFkYW0uUGx1dGhAaW5sLmdvdiIsImNyZWF0ZWRfYXQiOiIyMDIzLTAzLTE1VDA2OjAwOjAwLjAwMFoiLCJtb2RpZmllZF9hdCI6IjIwMjMtMDMtMTVUMDY6MDA6MDAuMDAwWiIsImNyZWF0ZWRfYnkiOiJzYW1sLWFkZnMgbG9naW4iLCJtb2RpZmllZF9ieSI6InNhbWwtYWRmcyBsb2dpbiIsInJlc2V0X3Rva2VuX2lzc3VlZCI6bnVsbCwiaWF0IjoxNjgwNTUwNDkxLCJleHAiOjE2ODMxNDI0OTF9.Z7aAilgXj6wYzVoMRLIfy-flewG3D-WUUi11nZGtVnuVOSXeQryD_-tQNEMRaHuJzS5qsZUaEzece2xoeUHEzm9E506wQIbFBqv6EOPYqTeY8GnlwB83YEtUlKWnmDJ8wR3xwtW8TUPcvbydpiJsrEDGtFdSwaWE-EGySFGJg7snA3aBh7u_Nvt8jzuPXUzOK54Srb7ZaKo-x_h29CBYM_HM0MCLq7HEV2pAiI_c-t4-B-Wgt7MGibTtetmLr5T81ry3lpodeGoI62n3g2bdhALmUPIW_krQGRn-TaHyMgAhFdeZwk1IEvlBS3rf4fld8tDNFKWYHE-0fQ0FexB4qQ";

  // useEffect(() => {
  //   async function getTimeseriesData() {
  //     const token = "bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNhbWxfYWRmcyIsImRpc3BsYXlfbmFtZSI6IkFkYW0uUGx1dGhAaW5sLmdvdiIsImVtYWlsIjoiQWRhbS5QbHV0aEBpbmwuZ292IiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJ1c2VyX2lkIjoiNDIiLCJrZXkiOiJORGhsTldGa09ERXRObUUwT1MwME1EYzVMV0UwTVRBdE16Y3lOV05pTm1JeE1tUTAiLCJzZWNyZXQiOiIkMmEkMTAkYWdQTVVjRlNNOFlCUTNHTmNkblhVZXNyZ0dRaWF6ckVIRUlzTVZtcEtOb1lLaGF5NkRhaFMiLCJub3RlIjoiV2ViIEdMIFZpZXdlciIsImlkIjoiNDIiLCJpZGVudGl0eV9wcm92aWRlcl9pZCI6IkFkYW0uUGx1dGhAaW5sLmdvdiIsImNyZWF0ZWRfYXQiOiIyMDIzLTAzLTE1VDA2OjAwOjAwLjAwMFoiLCJtb2RpZmllZF9hdCI6IjIwMjMtMDMtMTVUMDY6MDA6MDAuMDAwWiIsImNyZWF0ZWRfYnkiOiJzYW1sLWFkZnMgbG9naW4iLCJtb2RpZmllZF9ieSI6InNhbWwtYWRmcyBsb2dpbiIsInJlc2V0X3Rva2VuX2lzc3VlZCI6bnVsbCwiaWF0IjoxNjgwNTUwNDkxLCJleHAiOjE2ODMxNDI0OTF9.Z7aAilgXj6wYzVoMRLIfy-flewG3D-WUUi11nZGtVnuVOSXeQryD_-tQNEMRaHuJzS5qsZUaEzece2xoeUHEzm9E506wQIbFBqv6EOPYqTeY8GnlwB83YEtUlKWnmDJ8wR3xwtW8TUPcvbydpiJsrEDGtFdSwaWE-EGySFGJg7snA3aBh7u_Nvt8jzuPXUzOK54Srb7ZaKo-x_h29CBYM_HM0MCLq7HEV2pAiI_c-t4-B-Wgt7MGibTtetmLr5T81ry3lpodeGoI62n3g2bdhALmUPIW_krQGRn-TaHyMgAhFdeZwk1IEvlBS3rf4fld8tDNFKWYHE-0fQ0FexB4qQ";
  //     // const token = localStorage.getItem('user.token');

  //     const [timeseriesIdName, timeseriesTimestamp, timeseriesCount] = await Promise.all([
  //       // request 1
  //       axios.get ( `https://deeplynx.azuredev.inl.gov/containers/${containerId}/graphs/nodes/${nodeId}/timeseries`,   
  //         {
  //           headers: {
  //             Authorization: token
  //           }
  //         }).then ((response: any) => {
  //           setTableRowData(() => {
  //             let nodeTimeseriesData: any = [];
  //             const data = response.data.value;
  //             console.log(data)
  //             for (const property in data) {
  //                 nodeTimeseriesData.push({
  //                   id: Number(data[property][1]),
  //                   name: property,
  //                 })
  //             }

  //             return (
  //               nodeTimeseriesData
  //             )
  //           })
  //         }),
  //       // request 2
  //       axios.get ( `https://deeplynx.azuredev.inl.gov/containers/${containerId}/graphs/nodes/${nodeId}/timeseries`,   
  //       {
  //         headers: {
  //           Authorization: token
  //         }
  //       }).then ((response: any) => {
  //         setTableRowData(() => {
  //           let nodeTimeseriesData: any = [];
  //           const data = response.data.value;
  //           console.log(data)
  //           for (const property in data) {
  //               nodeTimeseriesData.push({
  //                 id: Number(data[property][1]),
  //                 name: property,
  //               })
  //           }

  //           return (
  //             nodeTimeseriesData
  //           )
  //         })
  //       }),
  //       // request 3
  //     ]);

  //   }

  //   getTimeseriesData();
  // }, []);

  useEffect(() => {
    async function getTimeseriesData() {
      const token = "bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNhbWxfYWRmcyIsImRpc3BsYXlfbmFtZSI6IkFkYW0uUGx1dGhAaW5sLmdvdiIsImVtYWlsIjoiQWRhbS5QbHV0aEBpbmwuZ292IiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJ1c2VyX2lkIjoiNDIiLCJrZXkiOiJORGhsTldGa09ERXRObUUwT1MwME1EYzVMV0UwTVRBdE16Y3lOV05pTm1JeE1tUTAiLCJzZWNyZXQiOiIkMmEkMTAkYWdQTVVjRlNNOFlCUTNHTmNkblhVZXNyZ0dRaWF6ckVIRUlzTVZtcEtOb1lLaGF5NkRhaFMiLCJub3RlIjoiV2ViIEdMIFZpZXdlciIsImlkIjoiNDIiLCJpZGVudGl0eV9wcm92aWRlcl9pZCI6IkFkYW0uUGx1dGhAaW5sLmdvdiIsImNyZWF0ZWRfYXQiOiIyMDIzLTAzLTE1VDA2OjAwOjAwLjAwMFoiLCJtb2RpZmllZF9hdCI6IjIwMjMtMDMtMTVUMDY6MDA6MDAuMDAwWiIsImNyZWF0ZWRfYnkiOiJzYW1sLWFkZnMgbG9naW4iLCJtb2RpZmllZF9ieSI6InNhbWwtYWRmcyBsb2dpbiIsInJlc2V0X3Rva2VuX2lzc3VlZCI6bnVsbCwiaWF0IjoxNjgwNTUwNDkxLCJleHAiOjE2ODMxNDI0OTF9.Z7aAilgXj6wYzVoMRLIfy-flewG3D-WUUi11nZGtVnuVOSXeQryD_-tQNEMRaHuJzS5qsZUaEzece2xoeUHEzm9E506wQIbFBqv6EOPYqTeY8GnlwB83YEtUlKWnmDJ8wR3xwtW8TUPcvbydpiJsrEDGtFdSwaWE-EGySFGJg7snA3aBh7u_Nvt8jzuPXUzOK54Srb7ZaKo-x_h29CBYM_HM0MCLq7HEV2pAiI_c-t4-B-Wgt7MGibTtetmLr5T81ry3lpodeGoI62n3g2bdhALmUPIW_krQGRn-TaHyMgAhFdeZwk1IEvlBS3rf4fld8tDNFKWYHE-0fQ0FexB4qQ";
      // const token = localStorage.getItem('user.token');

      // First Axios API Call

      try {
        const response = await axios.get(`https://deeplynx.azuredev.inl.gov/containers/${containerId}/graphs/nodes/${nodeId}/timeseries`,   
        {
          headers: {
            Authorization: token
          }
        });

        // Extract the data from the response
        let nodeTimeseriesData: any = [];
        const firstResponse = response.data.value;
        let count: any;
        let range: any;

        for (const property in firstResponse) {
          // Second Axios API Call
          const secondResponse = await axios.get(`https://deeplynx.azuredev.inl.gov/containers/${containerId}/import/datasources/${firstResponse[property][1]}/timeseries/count`,
          {
            headers: {
              Authorization: token
            }
          });
          
          count = secondResponse.data.value;

            // Third Axios API Call
          const thirdResponse = await  axios.get(`https://deeplynx.azuredev.inl.gov/containers/${containerId}/import/datasources/${firstResponse[property][1]}/timeseries/range`,
            {
              headers: {
                Authorization: token
              }
            });
            
            range = response.data.value;

          nodeTimeseriesData.push({
            id: Number(firstResponse[property][1]),
            name: property,
            lastIndex: range.end,
            entries: count.count,
          })

          setTableRowData(nodeTimeseriesData);
        }

      } catch (e) {
        //
      }
    }

    getTimeseriesData();
  }, []);

  console.log(tableRowData)

  const tableHeaders = [
    {title: 'Id', optionalWidth: '50px', alignment: 'left'},
    {title: 'Name', optionalWidth: '', alignment: 'left'},
    {title: 'Last Index', optionalWidth: '', alignment: 'left'},
    {title: 'Entries', optionalWidth: '', alignment: 'left'},
    // {title: 'Actions', alignment: 'center'}
  ];

  // // const tableData = data;
  // const tableRowData = [
  //   {
  //     id: 1,
  //     title: 'Timeseries 1',
  //     timestamp: '2023-03-01 14:39:34',
  //     data: [
  //       [2.4, '14:22:28'],
  //       [1.3, '14:23:28'],
  //       [2.0, '14:24:28'],
  //       [1.8, '14:25:28'],
  //       [2.4, '14:26:28'],
  //       [2.7, '14:27:28'],
  //       [.4, '14:28:28'],
  //     ]
  //   },
  //   {
  //     id: 2,
  //     title: 'Timeseries 1',
  //     timestamp: '2023-03-01 14:39:34',
  //     data: [
  //       [2.4, '14:22:28'],
  //       [1.3, '14:23:28'],
  //       [2.0, '14:24:28'],
  //       [1.8, '14:25:28'],
  //       [2.4, '14:26:28'],
  //       [2.7, '14:27:28'],
  //       [.4, '14:28:28'],
  //     ]
  //   }
  // ];

  const tableRowActions: any = [
    // {type: 'view',},
    // {type: 'edit',},
    // {type: 'delete',}
  ];

  return (
    <>
      <InfoHeader>
        Data
      </InfoHeader>
      {/* <ButtonIconText type="attach" handleClick={() => {console.log('yay!')}} text="Add New Data" color="primary" /> */}
      <DataTableBasic tableHeaders={tableHeaders} tableRowData={tableRowData} tableRowActions={tableRowActions} />
      <InfoHeader>
        Visualized Timeseries
      </InfoHeader>
      <Plot
        data={[
          {
            x: [1, 2, 3],
            y: [2, 6, 3],
            mode: 'lines',
            marker: {color: COLORS.colorPrimary},
          },
        ]}
        layout={{ height: 500 }}
      />
    </>
  );
}

export default NodeInfoTimeSeries;
