import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineOppositeContent from "@mui/lab/TimelineOppositeContent";
import TimelineDot from "@mui/lab/TimelineDot";

import { Ancestor, MeshObject } from "@/lib/types/modules/modelViewer";
import { Typography } from "@mui/material";

type Props = {
  ancestry: Array<Ancestor>;
  mesh: MeshObject;
};
export default function Ancestry(props: Props) {
  const ancestry: Array<Ancestor> = props.ancestry;
  const mesh: MeshObject = props.mesh;
  const assembly = mesh.Assembly;

  return (
    <>
      <Typography variant="body1">
        The model hierarchy lists the complete ancestry of the selected object
      </Typography>
      <br />
      <Timeline position={"left"}>
        {ancestry
          ? ancestry.map((ancestor: Ancestor) => {
              return (
                <TimelineItem key={ancestor.NodeId}>
                  <TimelineOppositeContent
                    sx={{ flex: 0.5 }}
                    typography={"body2"}
                  >
                    {ancestor.Name.toLowerCase()}
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot sx={{ backgroundColor: "black" }} />
                    <TimelineConnector />
                  </TimelineSeparator>
                  <TimelineContent sx={{ flex: 0.15 }} typography={"caption"}>
                    NodeID: {ancestor.NodeId}
                  </TimelineContent>
                </TimelineItem>
              );
            })
          : null}
        <TimelineItem key={assembly.NodeId}>
          <TimelineOppositeContent sx={{ flex: 0.5 }} typography={"body2"}>
            {assembly.Name.toLowerCase()}
          </TimelineOppositeContent>
          <TimelineSeparator>
            <TimelineDot sx={{ backgroundColor: "black" }} />
          </TimelineSeparator>
          <TimelineContent sx={{ flex: 0.15 }} typography={"caption"}>
            NodeID: {assembly.NodeId}
          </TimelineContent>
        </TimelineItem>
      </Timeline>
    </>
  );
}
