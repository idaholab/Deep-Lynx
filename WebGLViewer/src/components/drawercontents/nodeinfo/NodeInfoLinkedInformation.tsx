// React
import * as React from 'react';

// Hooks
import { useGetNodeLinkedInformationQuery } from '../../../../app/services/nodesDataApi';
import { useAppSelector } from '../../../../app/hooks/reduxTypescriptHooks';

// Styles
import '../../../styles/App.scss';

// Custom Components 
import InfoHeader from '../../elements/InfoHeader';
import DataTableBasic from '../../display/DataTableBasic';

type Props = {
  selectedAssetObject: any
};

const NodeInfoNearbyNodes: React.FC<Props> = ({
  selectedAssetObject
}) => {

  // DeepLynx
  const host: string = useAppSelector((state: any) => state.appState.host);
  const container: string = useAppSelector((state: any) => state.appState.container);
  const nodeId = selectedAssetObject.id

  const tableHeaders = [
    {title: 'Id', optionalWidth: '50px', alignment: 'left'},
    {title: 'Name', optionalWidth: '', alignment: 'left'},
    {title: 'Relationship', optionalWidth: '', alignment: 'left'},
    {title: 'Direction', optionalWidth: '', alignment: 'left'},
    // {title: 'Actions', optionalWidth: '', alignment: 'center'},
  ];

  const { data: response = [], isLoading } = useGetNodeLinkedInformationQuery({ host, container, nodeId });

  let tableRowData = [];

  if (!isLoading) {
    tableRowData = response?.value.map((obj: any) => ({
      id: obj.destination_id,
      name: obj.destination_properties.name,
      relationship: obj.relationship_name,
      direction: obj.edge_direction
    })) || [];
  }

  const tableRowActions: any = [
    // {type: 'delete'}
  ];

  return (
    <>
      <InfoHeader>
        Linked Info
      </InfoHeader>
      <DataTableBasic
        tableHeaders={tableHeaders}
        tableRowData={tableRowData}
        tableRowActions={tableRowActions}
        isLoading={isLoading}
      />
    </>
  );
}

export default NodeInfoNearbyNodes;
