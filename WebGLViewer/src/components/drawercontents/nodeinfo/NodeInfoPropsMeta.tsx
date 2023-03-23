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
  const convertDataToArray = (obj: any) => {
    if (obj !== null) {
      const array = Object.keys(obj).map((key) => [key.toString(), obj[key]]);
      return array
    } else {
      return []
    }
  }

  const PropertiesTableHeaders = [
    {title: 'Name', alignment: 'left'},
    {title: 'Value', alignment: 'left'},
    {title: 'Actions', alignment: 'center'},
  ];

  const PropertiesTableRowData = convertDataToArray(data.properties);

  const PropertiesTableRowActions = [
    {type: 'edit',},
    {type: 'delete',}
  ];

  const MetadataTableHeaders = [
    {title: 'Name', alignment: 'left'},
    {title: 'Value', alignment: 'left'},
    {title: 'Actions', alignment: 'center'},
  ];

  const MetadataTableRowData = convertDataToArray(data.metadata_properties);

  const MetadataTableRowActions = [
    {type: 'view',},
    {type: 'delete',}
  ];

  return (
    <>
      <InfoHeader>
        Properties
      </InfoHeader>
      {/* <ButtonIconText type="add" handleClick={() => {console.log('yay!')}} text="Add Property" color="primary" /> */}
      <DataTableBasic tableHeaders={PropertiesTableHeaders} tableRowData={PropertiesTableRowData} tableRowActions={PropertiesTableRowActions} />

      <InfoHeader>
        Metadata
      </InfoHeader>
      {/* <ButtonIconText type="add" handleClick={() => {console.log('yay!')}} text="Add Metadata" color="primary"/> */}
      <DataTableBasic tableHeaders={MetadataTableHeaders} tableRowData={MetadataTableRowData} tableRowActions={MetadataTableRowActions}  />
    </>
  );
}

export default NodeInfoPropsMeta;
