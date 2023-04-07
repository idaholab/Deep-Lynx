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

  // type containerId = Array<{ [key: string]: any; }>;
  const containerId = useAppSelector((state: any) => state.appState.containerId);

  useEffect(() => {
    async function getNodeFiles() {
      // const token = localStorage.getItem('user.token');
      const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNlcnZpY2UiLCJkaXNwbGF5X25hbWUiOiJXZWJHTCIsImVtYWlsIjoiIiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJ1c2VyX2lkIjoiMyIsImtleSI6Ik16RXdaalpqWVRndFpURmlaaTAwTkRneExXRTBNbVV0T1dVMFpEUXdNelV6TldRNSIsInNlY3JldCI6IiQyYSQxMCRnbGlFdG02RWV2ZlRmQmllN20xMmRPLjdVY2lsLnIyc2tMNjhhN3JFdEV2OWNuQWdkZEVTLiIsIm5vdGUiOm51bGwsImlkIjoiMyIsImlkZW50aXR5X3Byb3ZpZGVyX2lkIjpudWxsLCJjcmVhdGVkX2F0IjoiMjAyMy0wNC0wNlQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIzLTA0LTA2VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5IjoiMiIsIm1vZGlmaWVkX2J5IjoiMiIsInJlc2V0X3Rva2VuX2lzc3VlZCI6bnVsbCwiaWF0IjoxNjgwODEyMDA0LCJleHAiOjE3MTIzNjk2MDR9.fBFpQcdnDNc4zZ1AIReBkcY89EM8Ri7kQcQ10gnOubnM19e865D3ipZeUen4O_Jd5elJsfjwNyeW_DCJgof78A"

      await axios.get ( `http://localhost:8090/containers/${containerId}/graphs/nodes/${nodeId}/files`,   
        {
          headers: {
            Authorization: `bearer ${token}`
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
