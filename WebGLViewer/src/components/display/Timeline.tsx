// React
import * as React from 'react';

// MUI Components
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
};

const BasicTimeline: React.FC<Props> = ({
  data
}) => {

  const history = data;

  return (
    <Timeline>
      {history.map((historyItem, index) => {
        return (
          <TimelineItem key={index}
            sx={{
              '&::before': {
                display: 'none'
              },
              '&:last-of-type': {
                minHeight: 'unset'
              }
            }}>
              <TimelineSeparator>
                <TimelineDot
                  sx={{
                    backgroundColor: COLORS.colorPrimary
                  }}
                />
                {index !== history.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
            <TimelineContent>{ historyItem.time }</TimelineContent>
            <TimelineContent>{ historyItem.details }</TimelineContent>
          </TimelineItem>
        )
      })}
    </Timeline>
  );
}

export default BasicTimeline;
