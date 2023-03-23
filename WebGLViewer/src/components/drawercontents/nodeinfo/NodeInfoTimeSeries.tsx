// React
import * as React from 'react';

// Import Packages
import Plot from 'react-plotly.js';

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

  const tableHeaders = [
    {title: 'Id', alignment: 'left'},
    {title: 'Name', alignment: 'left'},
    {title: 'Timestamp', alignment: 'left'},
    {title: 'Entries', alignment: 'left'},
    {title: 'Actions', alignment: 'center'}
  ];

  // const tableData = data;
  const tableRowData = [
    {
      id: 1,
      title: 'Timeseries 1',
      timestamp: '2023-03-01 14:39:34',
      data: [
        [2.4, '14:22:28'],
        [1.3, '14:23:28'],
        [2.0, '14:24:28'],
        [1.8, '14:25:28'],
        [2.4, '14:26:28'],
        [2.7, '14:27:28'],
        [.4, '14:28:28'],
      ]
    },
    {
      id: 2,
      title: 'Timeseries 1',
      timestamp: '2023-03-01 14:39:34',
      data: [
        [2.4, '14:22:28'],
        [1.3, '14:23:28'],
        [2.0, '14:24:28'],
        [1.8, '14:25:28'],
        [2.4, '14:26:28'],
        [2.7, '14:27:28'],
        [.4, '14:28:28'],
      ]
    }
  ];

  const tableRowActions = [
    {type: 'view',},
    {type: 'edit',},
    {type: 'delete',}
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
