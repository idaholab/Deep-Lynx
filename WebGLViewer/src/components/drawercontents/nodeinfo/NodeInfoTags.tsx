// React
import * as React from 'react';

// Hooks
import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../../../app/hooks/reduxTypescriptHooks';

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

  const [tagList, setTagList] = useState(Array<{ [key: string]: any; }>);

  const tableHeaders = [
    {title: 'Name', optionalWidth: '', alignment: 'left'},
    // {title: 'Actions', alignment: 'center'},
  ];

  type webGLFileSetId = Array<{ [key: string]: any; }>;
  const webGLFileSetId = useAppSelector((state: any) => state.appState.selectedWebGLFileSetId);

  useEffect(() => {
    async function getTagList() {
      const files = JSON.parse(localStorage.getItem('node')!);
      const token = "bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNhbWxfYWRmcyIsImRpc3BsYXlfbmFtZSI6Ik5hdGhhbiBMLiBXb29kcnVmZiIsImVtYWlsIjoiTmF0aGFuLldvb2RydWZmQGlubC5nb3YiLCJhZG1pbiI6ZmFsc2UsImFjdGl2ZSI6dHJ1ZSwicmVzZXRfcmVxdWlyZWQiOmZhbHNlLCJlbWFpbF92YWxpZCI6ZmFsc2UsInR5cGUiOiJ1c2VyIiwicGVybWlzc2lvbnMiOltdLCJyb2xlcyI6W10sInVzZXJfaWQiOiIxOSIsImtleSI6Ik16SXlNVFJoTm1JdE9EYzNNaTAwWWpjMExXRmxaRFF0TkdOaE16VmlOR0l6TVdaaiIsInNlY3JldCI6IiQyYSQxMCRJREg5WXpGM2RmeXVpNDA2ZVFVSWhPU3Y1djQ2czNMaTlGTERJVlc4a2NpeERnZThNclpiMiIsIm5vdGUiOiJBZGFtIiwiaWQiOiIxOSIsImlkZW50aXR5X3Byb3ZpZGVyX2lkIjoiTmF0aGFuLldvb2RydWZmQGlubC5nb3YiLCJjcmVhdGVkX2F0IjoiMjAyMi0wOC0xOFQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIyLTA4LTE4VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5Ijoic2FtbC1hZGZzIGxvZ2luIiwibW9kaWZpZWRfYnkiOiJzYW1sLWFkZnMgbG9naW4iLCJyZXNldF90b2tlbl9pc3N1ZWQiOm51bGwsImlhdCI6MTY3ODkxMzA5OCwiZXhwIjoxNzEwNDcwNjk4fQ.6ex5ftZOQlOEkCev-G54qPE2waN3HZeDsMpK4ssPa_fEamUhd7-qt56OcM87VUSMNEDRYVPw74WF9PhyBUf2n4EslunCUZLYYpW1RdrQViDcbi6zHPlfMe0KrRwTsu4YobAVEMvEYkpA_wW0u0O4YfemEZdrqORYxMONHfmqCC_tA4FODi5hrv9ln3xH3DpmUaVXlvRzzFvPH5bE-jKV_gdmeunkFyfVuE1wuUx7I0jF6ZpUj1u09bikdvTo-FmchkRRGyYKKsbu5H3DZsr7JoT_tAnS_Z5O9MBeHu8uqciAc2esElkq3t_cpxi5yLriIx5mSEI6b7Fb6UEClVP5XA";

      await axios.get ( "http://localhost:8090/containers/2/graphs/tags",
        {
          headers: {
            Authorization: token
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
                setTagList(tagList);
              }
            })
          }
        )
    }

    getTagList();
  }, []);
  const tableRowData = tagList;

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
