import * as React from 'react';
import { useAppSelector } from '../../app/hooks';

// Load transitions
import Fade from '@mui/material/Fade';

// Load MUI components
import { Grid, Box } from '@mui/material';

// Load Custom Components

function LayoutDashboard() {

  return (
    <Box sx={{ padding: '30px' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={3} style={{ display: 'flex', flexDirection: 'column' }}>

        </Grid>
        <Grid item xs={12} lg={9} style={{ display: 'flex' }}>

        </Grid>

      </Grid>
    </Box>
  );
}

export default LayoutDashboard;
