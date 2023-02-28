// React
import * as React from 'react';

// Hooks
import { useAppSelector } from '../../app/hooks/reduxTypescriptHooks';

// Custom Components
import WebGL from '../components/display/WebGL';

function LayoutDashboard() {

  return (
    <WebGL></WebGL>
  );
}

export default LayoutDashboard;
