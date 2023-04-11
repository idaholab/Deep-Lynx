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
      const token = localStorage.getItem('user.token');
      
      await axios.get ( `${location.origin}/containers/${containerId}/graphs/nodes/${nodeId}/graph?depth=1`,
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
