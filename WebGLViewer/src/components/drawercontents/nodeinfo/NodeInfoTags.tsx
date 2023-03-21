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

const NodeInfoTags: React.FC<Props> = ({
  data
}) => {

  const tableHeaders = [
    {title: 'Id', alignment: 'left'},
    {title: 'Name', alignment: 'left'},
    {title: 'Actions', alignment: 'center'},
  ];

  // const tableData = data;
  const tableRowData = [
    {
      id: 1,
      name: 'Tag name 1',
    },
    {
      id: 2,
      name: 'Tag name 2',
    },
    {
      id: 3,
      name: 'Tag name 3',
    },
    {
      id: 4,
      name: 'Tag name 4',
    },
    {
      id: 5,
      name: 'Tag name 5',
    },
  ];

  const tableRowActions = [
    {type: 'delete'}
  ];

  return (
    <>
      <InfoHeader>
        Attached Tags
      </InfoHeader>
      <ButtonIconText type="add" handleClick={() => {console.log('yay!')}} text="Add New Tag" />
      <DataTableBasic tableHeaders={tableHeaders} tableRowData={tableRowData} tableRowActions={tableRowActions} />
    </>
  );
}

export default NodeInfoTags;
