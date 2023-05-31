// React
import * as React from 'react';

// Hooks
import { useState, useEffect } from 'react';
import { useAppSelector } from '../../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import axios from 'axios';

// Styles
import '../../../styles/App.scss';

// Custom Components 
import InfoHeader from '../../elements/InfoHeader';
import DataTableBasic from '../../display/DataTableBasic';

type Props = {
  data: any
};

const NodeInfoFiles: React.FC<Props> = ({
  data
}) => {
  // DeepLynx
  const host: string = useAppSelector((state: any) => state.appState.host);
  const token: string = useAppSelector((state: any) => state.appState.token);
  const container: string = useAppSelector((state: any) => state.appState.container);
  const nodeId = data.id
  const [tableRowData, setTableRowData] = useState([]);

  useEffect(() => {
    async function getNodeFiles() {
      await axios.get ( `${host}/containers/${container}/graphs/nodes/${nodeId}/files`,   
        {
          headers: {
            Authorization: `bearer ${token}`
          }
        }).then (
          (response: any) => {
            setTableRowData(() => {
              let nodeFiles: any = [];
              response.data.value.map((obj: any) => {
                return (
                  nodeFiles.push({
                    id: obj.id,
                    filename: obj.file_name,
                    size: obj.file_size
                  })
                )
              })
              return (
                nodeFiles
              )
            })
          }
        )
    }

    getNodeFiles();
  }, []);

  const tableHeaders = [
    {title: 'Id', optionalWidth: '50px', alignment: 'left'},
    {title: 'Filename', optionalWidth: 'calc(100% - 150px)',  alignment: 'left'},
    {title: 'Size (kb)', optionalWidth: '100px', alignment: 'left'},
    // {title: 'Actions', alignment: 'center'}
  ];

  const tableRowActions: any = [
    // {type: 'view',},
    // {type: 'delete',}
  ];

  return (
    <>
      <InfoHeader>
        File List
      </InfoHeader>
      {/* <ButtonIconText type="attach" handleClick={() => {console.log('yay!')}} text="Add New File" color="primary" /> */}
      <DataTableBasic tableHeaders={tableHeaders} tableRowData={tableRowData} tableRowActions={tableRowActions}  />
    </>
  );
}

export default NodeInfoFiles;
