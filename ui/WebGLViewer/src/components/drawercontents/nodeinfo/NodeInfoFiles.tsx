// React
import * as React from 'react';

// Hooks
import { useState } from 'react';
import { useGetNodeFilesQuery } from '../../../../app/services/nodesDataApi';
import { useAppSelector } from '../../../../app/hooks/reduxTypescriptHooks';

// Custom Components 
import InfoHeader from '../../elements/InfoHeader';
import DataTableBasic from '../../display/DataTableBasic';

type Props = {
  selectedAssetObject: any;
};

const NodeInfoFiles: React.FC<Props> = ({ selectedAssetObject }) => {
  const host: string = useAppSelector((state: any) => state.appState.host);
  const container: string = useAppSelector((state: any) => state.appState.container);
  const nodeId = selectedAssetObject.id;

  const { data: response = [], isLoading } = useGetNodeFilesQuery({ host, container, nodeId });

  let tableRowData = [];

  if (!isLoading) {
    tableRowData = response?.value.map((obj: any) => ({
      id: obj.id,
      filename: obj.file_name,
      size: obj.file_size
    })) || [];
  }

  const tableHeaders = [
    { title: 'Id', optionalWidth: '50px', alignment: 'left' },
    { title: 'Filename', optionalWidth: 'calc(100% - 150px)', alignment: 'left' },
    { title: 'Size (kb)', optionalWidth: '100px', alignment: 'left' },
  ];

  const tableRowActions: any = [];

  return (
    <>
      <InfoHeader>File List</InfoHeader>
      <DataTableBasic
        tableHeaders={tableHeaders}
        tableRowData={tableRowData}
        tableRowActions={tableRowActions}
        isLoading={isLoading}
      />
    </>
  );
};

export default NodeInfoFiles;