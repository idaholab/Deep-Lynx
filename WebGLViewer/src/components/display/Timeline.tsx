// React
import * as React from 'react';

// Import Packages
import { DateTime } from 'luxon';

// MUI Components
// Material
import {
  Box,
  Skeleton,
} from '@mui/material';

import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';

// Styles
// @ts-ignore
import COLORS from '../../styles/variables';

type Props = {
  data: Array<{ [key: string]: any; }>;
  isLoading: boolean
};

const BasicTimeline: React.FC<Props> = ({
  data,
  isLoading
}) => {

  const nodeHistory = data;

  const skeletonLoaderElements = 3;

  return (
    <>
      {isLoading || data.length === 0 ? (
        <>
          {[...Array(skeletonLoaderElements)].map((e, i) => {
            return (
              <Box sx={{ padding: '15px'}} key={i}>
                <Skeleton variant="rectangular" width={'100%'} height={25} />
              </Box>
            )
          })}
        </>
      ) :(
        <Timeline>
          {nodeHistory.map((nodeHistoryItem, index) => {
            return (
              <TimelineItem key={index}
                sx={{
                  '&::before': {
                    display: 'none'
                  },
                  '&:last-of-type': {
                    minHeight: 'unset'
                  }
                }}
              >
                <TimelineSeparator
                  sx={{
                    '& .MuiTimelineConnector:last-of-type': {
                      display: 'none'
                    }
                  }}
                >
                  <TimelineDot
                    sx={{
                      backgroundColor: COLORS.colorPrimary
                    }}
                  />
                  <TimelineConnector />
                </TimelineSeparator>
                <TimelineContent
                  sx={{ fontWeight: 'bold'}}>
                  {index === 0 ?
                    `
                    ${DateTime.fromISO(nodeHistoryItem.created_at).toLocaleString(DateTime.DATE_SHORT)}, 
                    ${DateTime.fromISO(nodeHistoryItem.created_at).toLocaleString(DateTime.TIME_WITH_SHORT_OFFSET)}
                    `
                    :
                    `
                    ${DateTime.fromISO(nodeHistoryItem.modified_at).toLocaleString(DateTime.DATE_SHORT)}, 
                    ${DateTime.fromISO(nodeHistoryItem.modified_at).toLocaleString(DateTime.TIME_WITH_SHORT_OFFSET)}
                    `
                  }
                </TimelineContent>
                <TimelineContent>
                  {index === 0 ?
                    'Node created by:'
                    : 'Node modified by:'
                  } { nodeHistoryItem.modified_by }
                </TimelineContent>
              </TimelineItem>
            )
          })}
        </Timeline>
      )}
    </>
  );
}

export default BasicTimeline;
