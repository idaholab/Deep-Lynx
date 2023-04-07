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
  data: any
};

const NodeInfoTags: React.FC<Props> = ({
  data
}) => {
  const nodeId = data.id
  const containerId = useAppSelector((state: any) => state.appState.containerId);

  const [tableRowData, setTableRowData] = useState(Array<{ [key: string]: any; }>);

  const tableHeaders = [
    {title: 'Name', optionalWidth: '', alignment: 'left'},
    // {title: 'Actions', alignment: 'center'},
  ];

  type webGLFileSetId = Array<{ [key: string]: any; }>;
  const webGLFileSetId = useAppSelector((state: any) => state.appState.selectedWebGLFileSetId);

  useEffect(() => {
    async function getTagList() {
      // const token = localStorage.getItem('user.token');
      const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNlcnZpY2UiLCJkaXNwbGF5X25hbWUiOiJXZWJHTCIsImVtYWlsIjoiIiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJ1c2VyX2lkIjoiMyIsImtleSI6Ik16RXdaalpqWVRndFpURmlaaTAwTkRneExXRTBNbVV0T1dVMFpEUXdNelV6TldRNSIsInNlY3JldCI6IiQyYSQxMCRnbGlFdG02RWV2ZlRmQmllN20xMmRPLjdVY2lsLnIyc2tMNjhhN3JFdEV2OWNuQWdkZEVTLiIsIm5vdGUiOm51bGwsImlkIjoiMyIsImlkZW50aXR5X3Byb3ZpZGVyX2lkIjpudWxsLCJjcmVhdGVkX2F0IjoiMjAyMy0wNC0wNlQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIzLTA0LTA2VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5IjoiMiIsIm1vZGlmaWVkX2J5IjoiMiIsInJlc2V0X3Rva2VuX2lzc3VlZCI6bnVsbCwiaWF0IjoxNjgwODEyMDA0LCJleHAiOjE3MTIzNjk2MDR9.fBFpQcdnDNc4zZ1AIReBkcY89EM8Ri7kQcQ10gnOubnM19e865D3ipZeUen4O_Jd5elJsfjwNyeW_DCJgof78A"

      await axios.get ( `http://localhost:8090/containers/${containerId}/graphs/tags/nodes/${nodeId}`,
        {
          headers: {
            Authorization: `bearer ${token}`
          }
        }).then (
          (response: any) => {
            const responseTagList = response.data.value;
            responseTagList.map((obj: any) => {
              if (obj.id === webGLFileSetId) {
                let tagList: Array<{ [key: string]: any; }> = [];
                if (typeof(obj.tag_name) === 'string') {
                  tagList = [{name: obj.tag_name}]
                } else if (Array.isArray(obj.tag_name)) {
                  obj.tag_name.map((tag: string) => {
                    responseTagList.push({name: tag})
                  })
                }
                setTableRowData(tagList);
              }
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
