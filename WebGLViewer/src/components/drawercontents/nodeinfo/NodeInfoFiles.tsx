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

const NodeInfoFiles: React.FC<Props> = ({
  data
}) => {

  const tableHeaders = [
    {title: 'Id', alignment: 'left'},
    {title: 'Filename', alignment: 'left'},
    {title: 'Size', alignment: 'left'},
    {title: 'Actions', alignment: 'center'}
  ];

  // const tableData = data;
  const tableRowData = [
    {
      id: 1,
      filename: 'File1.docx',
      size: '336kb',
    },
    {
      id: 2,
      filename: 'File2.docx',
      size: '197kb',
    },
    {
      id: 3,
      filename: 'File3.dwg',
      size: '398mb',
    },
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
      <ButtonIconText type="attach" handleClick={() => {console.log('yay!')}} text="Add New File" />
      <DataTableBasic tableHeaders={tableHeaders} tableRowData={tableRowData} tableRowActions={tableRowActions}  />
    </>
  );
}

export default NodeInfoFiles;
