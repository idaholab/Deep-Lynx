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

const NodeInfoNearbyNodes: React.FC<Props> = ({
  data
}) => {
  const nodeId = data.id
  const [tableRowData, setTableRowData] = useState([]);

  // type containerId = Array<{ [key: string]: any; }>;
  const containerId = useAppSelector((state: any) => state.appState.containerId);

  const tableHeaders = [
    {title: 'Id', optionalWidth: '50px', alignment: 'left'},
    {title: 'Name', optionalWidth: '', alignment: 'left'},
    {title: 'Relationship', optionalWidth: '', alignment: 'left'},
    {title: 'Direction', optionalWidth: '', alignment: 'left'},
    // {title: 'Actions', optionalWidth: '', alignment: 'center'},
  ];

  useEffect(() => {
    async function getNearbyNodes() {
      // const token = localStorage.getItem('user.token');
      const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNlcnZpY2UiLCJkaXNwbGF5X25hbWUiOiJXZWJHTCIsImVtYWlsIjoiIiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJ1c2VyX2lkIjoiMyIsImtleSI6Ik16RXdaalpqWVRndFpURmlaaTAwTkRneExXRTBNbVV0T1dVMFpEUXdNelV6TldRNSIsInNlY3JldCI6IiQyYSQxMCRnbGlFdG02RWV2ZlRmQmllN20xMmRPLjdVY2lsLnIyc2tMNjhhN3JFdEV2OWNuQWdkZEVTLiIsIm5vdGUiOm51bGwsImlkIjoiMyIsImlkZW50aXR5X3Byb3ZpZGVyX2lkIjpudWxsLCJjcmVhdGVkX2F0IjoiMjAyMy0wNC0wNlQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIzLTA0LTA2VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5IjoiMiIsIm1vZGlmaWVkX2J5IjoiMiIsInJlc2V0X3Rva2VuX2lzc3VlZCI6bnVsbCwiaWF0IjoxNjgwODEyMDA0LCJleHAiOjE3MTIzNjk2MDR9.fBFpQcdnDNc4zZ1AIReBkcY89EM8Ri7kQcQ10gnOubnM19e865D3ipZeUen4O_Jd5elJsfjwNyeW_DCJgof78A"

      await axios.get ( `http://localhost:8090/containers/${containerId}/graphs/nodes/${nodeId}/graph?depth=1`,
        {
          headers: {
            Authorization: `bearer ${token}`
          }
        }).then (
          (response: any) => {
            setTableRowData(() => {
              let nearbyNodes: any = [];
              let receivedData = response.data.value;
              receivedData.map((obj: any) => {
                return (
                  nearbyNodes.push({
                    id: obj.destination_id,
                    name: obj.destination_properties.name,
                    relationship: obj.relationship_name,
                    direction: obj.edge_direction
                  })
                )
              })
              return (
                nearbyNodes
              )
            })
          }
        )
    }

    getNearbyNodes();
  }, []);

  const tableRowActions: any = [
    // {type: 'delete'}
  ];

  return (
    <>
      <InfoHeader>
        Nearby Nodes
      </InfoHeader>
      <DataTableBasic tableHeaders={tableHeaders} tableRowData={tableRowData} tableRowActions={tableRowActions} />
    </>
  );
}

export default NodeInfoNearbyNodes;
