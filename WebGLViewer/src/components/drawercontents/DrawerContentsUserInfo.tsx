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
import NodeInfoMainTabs from '../drawercontents/NodeInfoMainTabs';
import ButtonIconText from '../elements/ButtonIconText';

// Styles
import '../../styles/App.scss';

type Props = {};

const DrawerContentsUserInfo: React.FC<Props> = ({}) => {
  const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  type selectedAssetObject = any;
  const selectedAssetObject: selectedAssetObject = useAppSelector((state: any) => state.appState.selectedAssetObject);

  type highlightAssetObject = any;
  const highlightAssetObject: highlightAssetObject = useAppSelector((state: any) => state.appState.highlightAssetObject);

  const handleSelectAssetOnScene = (payload: any) => {
    console.log(payload.payload.properties.name)
    dispatch(appStateActions.selectAssetOnScene(payload.properties.name))
  };

  const handleHighlightAssetOnScene = (payload: any) => {
    dispatch(appStateActions.highlightAssetOnScene(payload.properties.name))
  };

  const handleShowAssetOnGraph = (payload: any) => {
    console.log('Action to \"Show On Graph\" clicked!')
  }

  return (
    <>
      <Box sx={{ display: 'flex', padding: '0 16px' }}>
        <Typography sx={{ marginRight: '8px' }}>Actions:</Typography>
        <Stack spacing={1} direction="row">
          <ButtonIconText type="hub" handleClick={() => handleShowAssetOnGraph(selectedAssetObject)} text="Show On Graph" color="primary" />
          <ButtonIconText type="select" handleClick={() => handleSelectAssetOnScene(selectedAssetObject)} text="Select On Scene" color="primary" />
          <ButtonIconText type="highlight" handleClick={() => handleHighlightAssetOnScene(selectedAssetObject)} text="Highlight On Scene" color="primary" />
        </Stack>
      </Box>
      <Box sx={{ padding: '16px', display: 'flex', flex: '1 1 100%', flexDirection: 'column'}}>
        <NodeInfoMainTabs selectedAssetObject={selectedAssetObject} />
      </Box>
    </>
  );
}

export default DrawerContentsUserInfo;
