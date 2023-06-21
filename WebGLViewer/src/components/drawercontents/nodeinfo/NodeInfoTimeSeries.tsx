// React
import * as React from 'react';

// Hooks
import { useState, useEffect } from 'react';
import {
  useGetTimeseriesDataQuery,
  useGetTimeseriesCountQuery,
  useGetTimeseriesRangeQuery,
} from '../../../../app/services/timeseriesDataApi';
import { useAppSelector } from '../../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import axios from 'axios';
import { DateTime } from 'luxon';

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

  const isTimestamp = (entry: any) => {
    if (DateTime.fromISO(entry).isValid === true) {
      return `${DateTime.fromISO(entry).toLocaleString(DateTime.DATE_SHORT)}, ${DateTime.fromISO(entry).toLocaleString(DateTime.TIME_WITH_SHORT_OFFSET)}`;
    } else {
      return entry;
    }
  };

  const { data: { value: firstResponse = [] } = {} } = useGetTimeseriesDataQuery({ host, container, nodeId });
  const [tableRowData, setTableRowData] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(true);

  console.log(firstResponse)
  // useEffect(() => {
  //   const fetchData = async () => {
  //     if (firstResponse.length === 0) return;

  //     const nodeTimeseriesData: Array<any> = [];

  //     for (const property in firstResponse) {
  //       const dataSource = firstResponse[property][1];
  //       nodeTimeseriesData.push({
  //         id: Number(dataSource),
  //         name: property,
  //         dataSource,
  //       });
  //     }

  //     setTableRowData(nodeTimeseriesData);
  //   };

  //   fetchData();
  // }, [firstResponse]);

  // useEffect(() => {
  //   const fetchCountAndRange = async () => {
  //     if (tableRowData.length === 0) return;

  //     const updatedTableRowData = await Promise.all(tableRowData.map(async (row) => {
  //       const countResponse = await useGetTimeseriesCountQuery({ host, container, dataSource: row.dataSource });
  //       const rangeResponse = await useGetTimeseriesRangeQuery({ host, container, dataSource: row.dataSource });

  //       const count = countResponse.data.count;
  //       const range = rangeResponse.data.value;

  //       return {
  //         ...row,
  //         lastIndex: isTimestamp(range.end),
  //         entries: count,
  //       };
  //     }));

  //     setTableRowData(updatedTableRowData);
  //     setIsLoading(false);
  //   };

  //   fetchCountAndRange();
  // }, [tableRowData, host, container]);

    // console.log(tableRowData)

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
      {/* <DataTableBasic
        tableHeaders={tableHeaders}
        tableRowData={tableRowData}
        tableRowActions={tableRowActions}
        isLoading={isLoading}
      /> */}
    </>
  );
}

export default NodeInfoTimeSeries;