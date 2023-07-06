// React
import * as React from 'react';

// Hooks
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Import Redux Actions
import { appStateActions } from '../../../app/store/index';

// MUI Styles
import { useTheme } from '@mui/material/styles';

// MUI Components
import {
  Box,
  Stack,
  Typography
} from '@mui/material';

// Custom Components 
import SessionInfoMainTabs from './SessionInfoMainTabs';


// Styles
import '../../styles/App.scss';
import ButtonIconText from '../elements/ButtonIconText';

type Props = {};

const DrawerContentsSectionInfo: React.FC<Props> = ({}) => {
  const dispatch = useAppDispatch();

  const selectedSessionObject: any = useAppSelector((state: any) => state.appState.selectedSessionObject);

  return (
    <>
      <Box sx={{ display: 'flex', padding: '0 16px' }}>
        {/* <Typography sx={{ marginRight: '8px' }}>Actions: </Typography> */}
        {/* <Stack spacing={1} direction="row">
          <ButtonIconText type="hub" handleClick={() => handleShowAssetOnGraph(selectedAssetObject)} text="Show On Graph" color="primary" />
          <ButtonIconText type="select" handleClick={() => handleSelectAssetOnScene(selectedAssetObject)} text="Select On Scene" color="primary" />
          <ButtonIconText type="highlight" handleClick={() => handleHighlightAssetOnScene(selectedAssetObject)} text="Highlight On Scene" color="primary" />
        </Stack> */}
      </Box>
      <Box sx={{ padding: '16px', display: 'flex', flex: '1 1 100%', flexDirection: 'column'}}>
        <SessionInfoMainTabs data={selectedSessionObject} />
      </Box>
    </>
  );
}

export default DrawerContentsSectionInfo;
