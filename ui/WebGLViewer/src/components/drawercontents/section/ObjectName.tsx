// React
import * as React from 'react';
import { Popover,Typography } from '@mui/material';

const ObjectName: React.FC<{name: string}> = ({ name }) => {
    const [anchorEl, setAnchorEl] = React.useState<HTMLDivElement | null>(null);
  
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      setAnchorEl(event.currentTarget);
    };
  
    const handleClose = () => {
      setAnchorEl(null);
    };
  
    const open = Boolean(anchorEl);
  
    return (
      <>
        <div
          onClick={handleClick}
          style={{
            maxWidth: '165px',
            overflow: 'hidden',
            position: 'relative',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {name}
        </div>
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <Typography sx={{ p: 2 }}>{name}</Typography>
        </Popover>
      </>
    );
  };
  export default ObjectName;