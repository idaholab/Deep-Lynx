import * as React from 'react';
import { useAppSelector } from '../../app/hooks/hooks';

import WebGL from '../components/display/WebGL';

// Load transitions
import Fade from '@mui/material/Fade';

// Load MUI components
import { Grid, Box } from '@mui/material';

// Load Custom Components

function LayoutDashboard() {

  return (
    <WebGL></WebGL>
  );
}

export default LayoutDashboard;
