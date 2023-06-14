// React
import * as React from 'react';

// Hooks
import { useState, useEffect } from 'react';
import { useAppSelector } from '../../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import Plot from 'react-plotly.js';
import axios from 'axios';

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

  const [tableRowData, setTableRowData] = useState(Array<{ [key: string]: any; }>);

  const tableHeaders = [
    {title: 'Name', optionalWidth: '', alignment: 'left'},
    // {title: 'Actions', alignment: 'center'},
  ];

  useEffect(() => {
    async function getTagList() {
     
      await axios.get ( `${host}/containers/${container}/graphs/tags/nodes/${nodeId}`,
        {
          headers: {
            Authorization: `bearer ${token}`
          }
        }).then (
          (response: any) => {
            const responseTagList = response.data.value;
            responseTagList.map((obj: any) => {
              let tagList: Array<{ [key: string]: any; }> = [];
              if (typeof(obj.tag_name) === 'string') {
                tagList = [{name: obj.tag_name}]
              } else if (Array.isArray(obj.tag_name)) {
                obj.tag_name.map((tag: string) => {
                  responseTagList.push({name: tag})
                })
              }
              setTableRowData(tagList);
            })
          }
        )
    }

    getTagList();
  }, []);

  const tableRowActions: any = [
    // {type: 'delete'}
  ];

  return (
    <>
      <InfoHeader>
        Attached Tags
      </InfoHeader>
      {/* <ButtonIconText type="add" handleClick={() => {console.log('yay!')}} text="Add New Tag" color="primary" /> */}
      <DataTableBasic tableHeaders={tableHeaders} tableRowData={tableRowData} tableRowActions={tableRowActions} />
    </>
  );
}

export default NodeInfoTags;
