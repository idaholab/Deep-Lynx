import * as React from 'react';

// Hooks
import { useGetTimeseriesDataQuery } from '../../../../app/services/timeseriesDataApi';

import { useAppSelector } from '../../../../app/hooks/reduxTypescriptHooks';


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
  selectedAssetObject: any
};

const NodeInfoTimeSeries: React.FC<Props> = ({
  selectedAssetObject
}) => {

  // DeepLynx
  const host: string = useAppSelector((state: any) => state.appState.host);
  const container: string = useAppSelector((state: any) => state.appState.container);
  const nodeId = selectedAssetObject.id;

  const { data: response = [], isLoading } = useGetTimeseriesDataQuery({ host, container, nodeId });

  let tableRowData: Array<any> = [];

  if (!isLoading) {
    tableRowData = response
  }

  const tableHeaders = [
    { title: 'Id', optionalWidth: '50px', alignment: 'left' },
    { title: 'Name', optionalWidth: '', alignment: 'left' },
    { title: 'Last Index', optionalWidth: '', alignment: 'left' },
    { title: 'Entries', optionalWidth: '', alignment: 'left' },
  ];

  const tableRowActions: any = [
    // {type: 'view',},
    // {type: 'edit',},
    // {type: 'delete',}
  ];

  return (
    <>
      <InfoHeader>Data Sources</InfoHeader>
      <DataTableBasic
        tableHeaders={tableHeaders}
        tableRowData={tableRowData}
        tableRowActions={tableRowActions}
        isLoading={isLoading}
      />
    </>
  );
}

export default NodeInfoTimeSeries;
