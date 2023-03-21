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

type Props = {
  data: any
};

const NodeInfoPropsMeta: React.FC<Props> = ({
  data
}) => {

  const PropertiesTableHeaders = [
    {title: 'Name', alignment: 'left'},
    {title: 'Value', alignment: 'left'},
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
    {title: 'Name', alignment: 'left'},
    {title: 'Value', alignment: 'left'},
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
      <p>Nearby Nodes go here</p>
    </>
  );
}

export default NodeInfoPropsMeta;
