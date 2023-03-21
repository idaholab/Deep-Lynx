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
import DataTableBasic from '../../display/DataTableBasic';
import ButtonIconText from '../../elements/ButtonIconText';

type Props = {
  data: any
};

const NodeInfoPropsMeta: React.FC<Props> = ({
  data
}) => {

  const PropertiesTableHeaders = [
    {title: 'Id', alignment: 'left'},
    {title: 'Name', alignment: 'left'},
    {title: 'Value', alignment: 'left'},
    {title: 'Actions', alignment: 'center'},
  ];

  // const tableData = data;
  const PropertiesTableRowData = [
    {
      id: 1,
      name: 'id',
      value: 'st7',
    },
    {
      id: 2,
      name: 'name',
      value: 'shack',
    },
    {
      id: 3,
      name: 'fruits',
      value: 'pear',
    },
    {
      id: 4,
      name: 'vegetables',
      value: 'carrot',
    },
    {
      id: 5,
      name: 'grains',
      value: 'wheat',
    },
  ];

  const PropertiesTableRowActions = [
    {type: 'edit',},
    {type: 'delete',}
  ];

  const MetadataTableHeaders = [
    {title: 'Id', alignment: 'left'},
    {title: 'Name', alignment: 'left'},
    {title: 'Value', alignment: 'left'},
    {title: 'Actions', alignment: 'center'},
  ];

  // const tableData = data;
  const MetadataTableRowData = [
    {
      id: 1,
      name: 'id',
      value: 'st7',
    },
    {
      id: 2,
      name: 'name',
      value: 'shack',
    },
    {
      id: 3,
      name: 'fruits',
      value: 'pear',
    },
    {
      id: 4,
      name: 'vegetables',
      value: 'carrot',
    },
    {
      id: 5,
      name: 'grains',
      value: 'wheat',
    },
  ];

  const MetadataTableRowActions = [
    {type: 'view',},
    {type: 'delete',}
  ];

  return (
    <>
      <InfoHeader>
        Properties
      </InfoHeader>
      <ButtonIconText type="add" handleClick={() => {console.log('yay!')}} text="Add Property" />
      <DataTableBasic tableHeaders={PropertiesTableHeaders} tableRowData={PropertiesTableRowData} tableRowActions={PropertiesTableRowActions} />

      <InfoHeader>
        Metadata
      </InfoHeader>
      <ButtonIconText type="add" handleClick={() => {console.log('yay!')}} text="Add Metadata" />
      <DataTableBasic tableHeaders={MetadataTableHeaders} tableRowData={MetadataTableRowData} tableRowActions={MetadataTableRowActions}  />
    </>
  );
}

export default NodeInfoPropsMeta;
