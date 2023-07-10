// React
import * as React from 'react';

// Hooks
import { useAppSelector, useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';
import { useDeleteSessionMutation } from '../../../app/services/sessionsDataApi';

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
  const host: string = useAppSelector((state: any) => state.appState.host);
  const container: string = useAppSelector((state: any) => state.appState.container);

    // Delete a Session
    const [deleteSession, { isLoading: isLoadingDeleteSession }] = useDeleteSessionMutation();

    const handleDeleteSession = async (sessionId: string) => {
      try {
        const response = await deleteSession({
          host: host,
          container: container,
          sessionId,
        }).unwrap();
        console.log('Response:', response);
        dispatch(appStateActions.deleteSession(sessionId));
      } catch (error) {
        console.error('There was an error!', error);
      }
    };

  return (
    <>
      <Box sx={{ display: 'flex', padding: '0 16px' }}>
        <Typography sx={{ marginRight: '8px' }}>Actions: </Typography>
        <Stack spacing={1} direction="row">
          <ButtonIconText type="delete" handleClick={() => handleDeleteSession(selectedSessionObject.id)} text="Delete Session" color="primary" />
        </Stack>
      </Box>
      <Box sx={{ padding: '16px', display: 'flex', flex: '1 1 100%', flexDirection: 'column'}}>
        <SessionInfoMainTabs data={selectedSessionObject} />
      </Box>
    </>
  );
}

export default DrawerContentsSectionInfo;
