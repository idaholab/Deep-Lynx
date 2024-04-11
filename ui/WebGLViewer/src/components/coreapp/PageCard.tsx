// React
import * as React from 'react';

// MUI Components
import {
  Card,
  CardContent,
  Typography
} from '@mui/material';

// Styles
import '../../styles/App.scss';
// @ts-ignore
import COLORS from '../../styles/variables';

export default function PageCard(props: any) {
  const { title, children, className } = props;

  const classes = `card ${className}`;

  return (
    <Card
      sx={{
        margin: '36px 40px',
        backgroundColor: COLORS.colorDarkgray,
        backgroundImage: 'none',
        boxShadow: 'none',
      }}
      className={classes}
    >
      <CardContent
        sx={{
          width: '100%',
          padding: '24px 30px',
          marginBottom: '8px',
          backgroundColor: 'transparent',
        }}
      >
        <Typography
          variant="h2"
          sx={{ textAlign: 'left', paddingBottom: '16px' }}
        >
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}
