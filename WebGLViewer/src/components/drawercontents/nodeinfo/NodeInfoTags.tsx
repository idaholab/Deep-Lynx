// React
import * as React from 'react';

// Hooks
import { useGetNodeTagsQuery } from '../../../../app/services/nodesDataApi';
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

const NodeInfoTags: React.FC<Props> = ({
  selectedAssetObject
}) => {
  // DeepLynx
  const host: string = useAppSelector((state: any) => state.appState.host);
  const token: string = useAppSelector((state: any) => state.appState.token);
  const container: string = useAppSelector((state: any) => state.appState.container);
  const nodeId = selectedAssetObject.id;

  const tableHeaders = [
    {title: 'Name', optionalWidth: '', alignment: 'left'},
    // {title: 'Actions', alignment: 'center'},
  ];

  const { data: response = [], isLoading } = useGetNodeTagsQuery({ host, container, nodeId });

  let tableRowData = [];

  if (!isLoading) {
    tableRowData = response?.value.flatMap((obj: any) => {
      if (typeof obj.tag_name === 'string') {
        return [{ name: obj.tag_name }];
      } else if (Array.isArray(obj.tag_name)) {
        return obj.tag_name.map((tag: string) => ({ name: tag }));
      }
      return [];
    }) || [];
  }

  const tableRowActions: any = [
    // {type: 'delete'}
  ];

  return (
    <>
      <InfoHeader>
        Attached Tags
      </InfoHeader>
      {/* <ButtonIconText type="add" handleClick={() => {console.log('yay!')}} text="Add New Tag" color="primary" /> */}
      <DataTableBasic
        tableHeaders={tableHeaders}
        tableRowData={tableRowData}
        tableRowActions={tableRowActions}
        isLoading={isLoading}
      />
    </>
  );
}

export default NodeInfoTags;
