// React
import * as React from 'react';

// Hooks
import { useState, useEffect } from 'react';
import { useAppSelector } from '../../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import axios from 'axios';

// Styles
import '../../../styles/App.scss';

// Custom Components 
import InfoHeader from '../../elements/InfoHeader';
import DataTableBasic from '../../display/DataTableBasic';

type Props = {
  data: any
};

const NodeInfoFiles: React.FC<Props> = ({
  data
}) => {
  const nodeId = data.id
  const [tableRowData, setTableRowData] = useState([]);

  type containerId = Array<{ [key: string]: any; }>;
  const containerId = useAppSelector((state: any) => state.appState.containerId);

  useEffect(() => {
    async function getTimeSeriesData() {
      // const token = "bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNhbWxfYWRmcyIsImRpc3BsYXlfbmFtZSI6Ik5hdGhhbiBMLiBXb29kcnVmZiIsImVtYWlsIjoiTmF0aGFuLldvb2RydWZmQGlubC5nb3YiLCJhZG1pbiI6ZmFsc2UsImFjdGl2ZSI6dHJ1ZSwicmVzZXRfcmVxdWlyZWQiOmZhbHNlLCJlbWFpbF92YWxpZCI6ZmFsc2UsInR5cGUiOiJ1c2VyIiwicGVybWlzc2lvbnMiOltdLCJyb2xlcyI6W10sInVzZXJfaWQiOiIxOSIsImtleSI6Ik16SXlNVFJoTm1JdE9EYzNNaTAwWWpjMExXRmxaRFF0TkdOaE16VmlOR0l6TVdaaiIsInNlY3JldCI6IiQyYSQxMCRJREg5WXpGM2RmeXVpNDA2ZVFVSWhPU3Y1djQ2czNMaTlGTERJVlc4a2NpeERnZThNclpiMiIsIm5vdGUiOiJBZGFtIiwiaWQiOiIxOSIsImlkZW50aXR5X3Byb3ZpZGVyX2lkIjoiTmF0aGFuLldvb2RydWZmQGlubC5nb3YiLCJjcmVhdGVkX2F0IjoiMjAyMi0wOC0xOFQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIyLTA4LTE4VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5Ijoic2FtbC1hZGZzIGxvZ2luIiwibW9kaWZpZWRfYnkiOiJzYW1sLWFkZnMgbG9naW4iLCJyZXNldF90b2tlbl9pc3N1ZWQiOm51bGwsImlhdCI6MTY3ODkxMzA5OCwiZXhwIjoxNzEwNDcwNjk4fQ.6ex5ftZOQlOEkCev-G54qPE2waN3HZeDsMpK4ssPa_fEamUhd7-qt56OcM87VUSMNEDRYVPw74WF9PhyBUf2n4EslunCUZLYYpW1RdrQViDcbi6zHPlfMe0KrRwTsu4YobAVEMvEYkpA_wW0u0O4YfemEZdrqORYxMONHfmqCC_tA4FODi5hrv9ln3xH3DpmUaVXlvRzzFvPH5bE-jKV_gdmeunkFyfVuE1wuUx7I0jF6ZpUj1u09bikdvTo-FmchkRRGyYKKsbu5H3DZsr7JoT_tAnS_Z5O9MBeHu8uqciAc2esElkq3t_cpxi5yLriIx5mSEI6b7Fb6UEClVP5XA";
      const token = localStorage.getItem('user.token');

      await axios.get ( `${location.origin}/containers/${containerId}/graphs/nodes/${nodeId}/files`,   
        {
          headers: {
            Authorization: token
          }
        }).then (
          (response: any) => {
            setTableRowData(() => {
              let nodeTimeseriesData: any = [];
              const data = response.data.value;
              for (const property in data) {
                // console.log(`${property}: ${object[property]}`);
                return (
                  nodeTimeseriesData.push({
                    id: data[property],
                    name: property,
                  })
                )
              }
              // response.data.value.map((obj: any) => {
              //   return (
              //     nodeTimeseriesData.push({
              //       id: obj.id,
              //       name: item,
              //     })
              //   )
              // })
              return (
                console.log(nodeTimeseriesData)
                // nodeTimeseriesData
              )
            })
          }
        )
    }

    getTimeSeriesData();
  }, []);

  const tableHeaders = [
    {title: 'Id', optionalWidth: '50px', alignment: 'left'},
    {title: 'Filename', optionalWidth: 'calc(100% - 150px)',  alignment: 'left'},
    {title: 'Size (kb)', optionalWidth: '100px', alignment: 'left'},
    // {title: 'Actions', alignment: 'center'}
  ];

  const tableRowActions: any = [
    // {type: 'view',},
    // {type: 'delete',}
  ];

  return (
    <>
      <InfoHeader>
        File List
      </InfoHeader>
      {/* <ButtonIconText type="attach" handleClick={() => {console.log('yay!')}} text="Add New File" color="primary" /> */}
      <DataTableBasic tableHeaders={tableHeaders} tableRowData={tableRowData} tableRowActions={tableRowActions}  />
    </>
  );
}

export default NodeInfoFiles;
