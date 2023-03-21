// React
import * as React from 'react';

// Hooks
import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';

// Import Packages
import classNames from 'classnames';

// Import Redux Actions
import { appStateActions } from '../../../app/store/index';

// MUI Styles
import { useTheme } from '@mui/material/styles';

// MUI Components
import {
  Box,
  Button,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';

// MUI Icons
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';

// Custom Components 
import NodeInfoMainTabs from '../drawercontents/NodeInfoMainTabs';
import ButtonIconText from '../elements/ButtonIconText';

// Styles
import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../styles/variables';

const DrawerContentsNodeInfo: React.FC = (props: any) => {
  const { children } = props;

  const theme = useTheme();
  const dispatch = useAppDispatch();

  type openDrawerLeftState = boolean;
  const openDrawerLeftState: openDrawerLeftState = useAppSelector((state: any) => state.appState.openDrawerLeft);

  type openDrawerLeftWidth = number;
  const openDrawerLeftWidth: openDrawerLeftWidth = useAppSelector((state: any) => state.appState.openDrawerLeftWidth);

  const [selected, setSelected] = React.useState<string | false>(false);

  type selectedAssetObject = any;
  const selectedAssetObject: selectedAssetObject = useAppSelector((state: any) => state.appState.selectedAssetObject);
  const handleSelectAssetObject = (obj: any, selectedItem: string) => {
    dispatch(appStateActions.selectAssetObject(obj));
    setSelected(selectedItem);
  };

  type selectAssetOnScene = string;
  const selectAssetOnScene: selectAssetOnScene = useAppSelector((state: any) => state.appState.selectAssetOnScene);
  const handleSelectAssetOnScene = (payload: string) => {
    dispatch(appStateActions.selectAssetOnScene(payload))
  };

  type highlightAssetOnScene = string;
  const highlightAssetOnScene: highlightAssetOnScene = useAppSelector((state: any) => state.appState.highlightAssetOnScene);
  const handleHighlightAssetOnScene = (payload: string) => {
    dispatch(appStateActions.highlightAssetOnScene(payload))
  };

  const handleShowAssetOnGraph = (payload: string) => {
    console.log('Action to \"Show On Graph\" clicked!')
  }

  const handleToggleDataView = (payload: string) => {
    dispatch(appStateActions.setDataViewObject(payload));
    dispatch(appStateActions.toggleDrawerRight())
  }

  const handleDeselectAssetObject = () => {
    dispatch(appStateActions.selectAssetObject({}));
    setSelected('');
  };

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', padding: '16px 0px 0', overflowX: 'hidden', }}
      className={classNames(
        'drawer-left-sizing',
        {
          'drawer-left-sizing-asset-selected': Object.keys(selectedAssetObject).length !== 0,
        },
      )}
    >
      <Box sx={{ flex: '1, 1, auto', display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '12px' }}>
        <Typography
          variant="h3"
          sx={{
            alignItems: 'center',
            padding: '0 0 0 16px'
          }}
        >
          Node Attributes
        </Typography>
        <Tooltip title="View node information">
          <InfoIcon sx={{ fill: COLORS.colorDarkgray2, marginLeft: '10px', marginRight: '10px', height: '15px', width: '15px' }} />
        </Tooltip>
        <Button
          variant="contained"
          size="small"
          color="error"
          sx={{
            marginLeft: 'auto',
            marginRight: '12px',
            color: 'white',
            padding: '4px 12px 4px 8px',
            '& span': {
              fontSize: '16px'
            }
          }}
          onClick={() => {
            handleDeselectAssetObject()
          }}
        >
          <CloseIcon sx={{ fontSize: '20px', paddingTop: '2px'}} /><span>Back to list</span>
        </Button>
      </Box>
      <Box sx={{ display: 'flex', padding: '0 16px' }}>
        <Typography sx={{ marginRight: '8px' }}>Actions:</Typography>
        <Stack spacing={1} direction="row">
          <ButtonIconText type="hub" handleClick={() => {console.log('yay!')}} text="Show On Graph" />
          <ButtonIconText type="select" handleClick={() => {console.log('yay!')}} text="Select On Scene" />
          <ButtonIconText type="highlight" handleClick={() => {console.log('yay!')}} text="Highlight On Scene" />
        </Stack>
      </Box>
      <Box sx={{ padding: '16px', display: 'flex', flex: '1 1 100%', flexDirection: 'column'}}>
        <NodeInfoMainTabs data={selectedAssetObject} />
      </Box>
    </Box>
  );
}

export default DrawerContentsNodeInfo;
