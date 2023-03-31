// React
import * as React from 'react';

// Hooks
import { useState, useEffect } from 'react';

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
  const nodeFileId = data.id
  const [tableRowData, setTableRowData] = useState([]);

  useEffect(() => {
    async function getNodeFiles() {
      const files = JSON.parse(localStorage.getItem('node')!);
      const token = "bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNhbWxfYWRmcyIsImRpc3BsYXlfbmFtZSI6Ik5hdGhhbiBMLiBXb29kcnVmZiIsImVtYWlsIjoiTmF0aGFuLldvb2RydWZmQGlubC5nb3YiLCJhZG1pbiI6ZmFsc2UsImFjdGl2ZSI6dHJ1ZSwicmVzZXRfcmVxdWlyZWQiOmZhbHNlLCJlbWFpbF92YWxpZCI6ZmFsc2UsInR5cGUiOiJ1c2VyIiwicGVybWlzc2lvbnMiOltdLCJyb2xlcyI6W10sInVzZXJfaWQiOiIxOSIsImtleSI6Ik16SXlNVFJoTm1JdE9EYzNNaTAwWWpjMExXRmxaRFF0TkdOaE16VmlOR0l6TVdaaiIsInNlY3JldCI6IiQyYSQxMCRJREg5WXpGM2RmeXVpNDA2ZVFVSWhPU3Y1djQ2czNMaTlGTERJVlc4a2NpeERnZThNclpiMiIsIm5vdGUiOiJBZGFtIiwiaWQiOiIxOSIsImlkZW50aXR5X3Byb3ZpZGVyX2lkIjoiTmF0aGFuLldvb2RydWZmQGlubC5nb3YiLCJjcmVhdGVkX2F0IjoiMjAyMi0wOC0xOFQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIyLTA4LTE4VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5Ijoic2FtbC1hZGZzIGxvZ2luIiwibW9kaWZpZWRfYnkiOiJzYW1sLWFkZnMgbG9naW4iLCJyZXNldF90b2tlbl9pc3N1ZWQiOm51bGwsImlhdCI6MTY3ODkxMzA5OCwiZXhwIjoxNzEwNDcwNjk4fQ.6ex5ftZOQlOEkCev-G54qPE2waN3HZeDsMpK4ssPa_fEamUhd7-qt56OcM87VUSMNEDRYVPw74WF9PhyBUf2n4EslunCUZLYYpW1RdrQViDcbi6zHPlfMe0KrRwTsu4YobAVEMvEYkpA_wW0u0O4YfemEZdrqORYxMONHfmqCC_tA4FODi5hrv9ln3xH3DpmUaVXlvRzzFvPH5bE-jKV_gdmeunkFyfVuE1wuUx7I0jF6ZpUj1u09bikdvTo-FmchkRRGyYKKsbu5H3DZsr7JoT_tAnS_Z5O9MBeHu8uqciAc2esElkq3t_cpxi5yLriIx5mSEI6b7Fb6UEClVP5XA";

      await axios.get ( `https://deeplynx.azuredev.inl.gov/containers/111/graphs/nodes/${nodeFileId}/files`,
        {
          headers: {
            Authorization: token
          }
        }).then (
          (response: any) => {
            setTableRowData(() => {
              let nodeFiles: any = [];
              response.data.value.map((obj: any) => {
                return (
                  nodeFiles.push({
                    id: obj.id,
                    filename: obj.file_name,
                    size: obj.file_size
                  })
                )
              })
              return (
                nodeFiles
              )
            })
          }
        )
    }

    getNodeFiles();
  }, []);

  const tableHeaders = [
    {title: 'Id', alignment: 'left'},
    {title: 'Filename', alignment: 'left'},
    {title: 'Size', alignment: 'left'},
    {title: 'Actions', alignment: 'center'}
  ];

  const tableRowActions = [
    {type: 'view',},
    {type: 'delete',}
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
