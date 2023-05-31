// React
import * as React from 'react';

// Hooks
import { useState, useEffect } from 'react';
import { useAppSelector } from '../../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import axios from 'axios';
import { DateTime } from 'luxon';

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

const NodeInfoTimeSeries: React.FC<Props> = ({
  data
}) => {

  // DeepLynx
  const host: string = useAppSelector((state: any) => state.appState.host);
  const token: string = useAppSelector((state: any) => state.appState.token);
  const container: string = useAppSelector((state: any) => state.appState.container);
  const nodeId = data.id


  const [tableRowData, setTableRowData] = useState(Array<{ [key: string]: any; }>);

  const isTimestamp = (entry: any) => {
    if (DateTime.fromISO(entry).isValid === true) {
      return (
        `
        ${DateTime.fromISO(entry).toLocaleString(DateTime.DATE_SHORT)}, 
        ${DateTime.fromISO(entry).toLocaleString(DateTime.TIME_WITH_SHORT_OFFSET)}
        `
      )
    } else {
      return entry
    }
  }

  useEffect(() => {
    async function getTimeseriesData() {
      // First Axios API Call
      try {
        const response = await axios.get(`${host}/containers/${container}/graphs/nodes/${nodeId}/timeseries`,   
        {
          headers: {
            Authorization: `bearer ${token}`
          }
        });

        // Extract the data from the response
        let nodeTimeseriesData: any = [];
        const firstResponse = response.data.value;
        let count: any;
        let range: any;

        for (const property in firstResponse) {
          // Second Axios API Call
          const secondResponse = await axios.get(`${host}/containers/${container}/import/datasources/${firstResponse[property][1]}/timeseries/count`,
          {
            headers: {
              Authorization: `bearer ${token}`
            }
          });
          
          count = secondResponse.data.value;

            // Third Axios API Call
          const thirdResponse = await  axios.get(`${host}/containers/${container}/import/datasources/${firstResponse[property][1]}/timeseries/range`,
            {
              headers: {
                Authorization: `bearer ${token}`
              }
            });
            
            range = thirdResponse.data.value;

          nodeTimeseriesData.push({
            id: Number(firstResponse[property][1]),
            name: property,
            lastIndex: isTimestamp(range.end),
            entries: count.count,
          })
        }

        setTableRowData(nodeTimeseriesData);

      } catch (e) {
        //
      }
    }

    getTimeseriesData();
  }, []);

  const tableHeaders = [
    {title: 'Id', optionalWidth: '50px', alignment: 'left'},
    {title: 'Name', optionalWidth: '', alignment: 'left'},
    {title: 'Last Index', optionalWidth: '', alignment: 'left'},
    {title: 'Entries', optionalWidth: '', alignment: 'left'},
    // {title: 'Actions', alignment: 'center'}
  ];

  const tableRowActions: any = [
    // {type: 'view',},
    // {type: 'edit',},
    // {type: 'delete',}
  ];

  return (
    <>
      <InfoHeader>
        Data Sources
      </InfoHeader>
      {/* <ButtonIconText type="attach" handleClick={() => {console.log('yay!')}} text="Add New Data" color="primary" /> */}
      <DataTableBasic tableHeaders={tableHeaders} tableRowData={tableRowData} tableRowActions={tableRowActions} />
    </>
  );
}

export default NodeInfoTimeSeries;
