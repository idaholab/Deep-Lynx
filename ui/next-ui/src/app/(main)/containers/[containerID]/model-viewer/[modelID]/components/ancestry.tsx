import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";

import { Ancestor } from "@/lib/types/modules/modelViewer";

type Props = {
  ancestry: Array<Ancestor>;
};
export default function Ancestry(props: Props) {
  const ancestry: Array<Ancestor> = props.ancestry;
  return (
    <>
      <Timeline>
        {ancestry
          ? ancestry.map((ancestor: Ancestor) => {
              return (
                <TimelineItem key={ancestor.NodeId}>
                  <TimelineSeparator>
                    <TimelineDot />
                    <TimelineConnector />
                  </TimelineSeparator>
                  <TimelineContent>{ancestor.Name}</TimelineContent>
                </TimelineItem>
              );
            })
          : null}
      </Timeline>
    </>
  );
}
