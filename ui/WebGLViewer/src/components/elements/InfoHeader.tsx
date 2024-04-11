// React
import * as React from 'react';

// MUI Components
import {
  Box,
  Typography
} from '@mui/material';

// Styles
import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../styles/variables';

type Props = {
  children: React.ReactNode;
};

const InfoHeader: React.FC<Props> = ({
  children
}) => {

  return (
    <>
      <Box sx={{ borderBottom: `1px solid ${COLORS.colorDarkgray}`, marginBottom: '16px'}}>
        <Typography variant="h3" noWrap component="div">
          {children}
        </Typography>
      </Box>
    </>
  )
}

export default InfoHeader;
