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
  selectedAssetObject: any
};

const NodeInfoPropsMeta: React.FC<Props> = ({
  selectedAssetObject
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
    {title: 'Name', optionalWidth: '300px', alignment: 'left'},
    {title: 'Value', optionalWidth: '', alignment: 'left'},
    // {title: 'Actions', alignment: 'center'},
  ];

  const PropertiesTableRowData = convertDataToArray(selectedAssetObject.properties);

  const PropertiesTableRowActions: any = [
    // {type: 'edit',},
    // {type: 'delete',}
  ];

  const MetadataTableHeaders = [
    {title: 'Name', optionalWidth: '300px', alignment: 'left'},
    {title: 'Value', optionalWidth: '', alignment: 'left'},
    // {title: 'Actions', alignment: 'center'},
  ];

  const MetadataTableRowData = convertDataToArray(selectedAssetObject.metadata_properties);

  const MetadataTableRowActions: any = [
    // {type: 'view',},
    // {type: 'delete',}
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
