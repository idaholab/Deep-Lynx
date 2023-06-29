// React
import * as React from 'react';

// MUI Components
import {
  Box,
  CircularProgress,
  Typography
} from '@mui/material';

// Styles
import '../../styles/App.scss';

type Props = {
  text: string
};

const LoadingProgress: React.FC<Props> = ({
  text
}) => {

  return (
    <>
      <Box sx={{ padding: '12px', display: 'flex', flexDirection: 'row', alignContent: 'center' }}>
        <CircularProgress size={14} sx={{ marginRight: '8px', display: 'flex' }} />
        <Typography sx={{ display: 'flex', marginTop: '-3px', fontSize: '14px' }}>{ text }</Typography>
      </Box>
    </>
  )
}

export default LoadingProgress;
