// MUI
import Timeline from "@mui/lab/Timeline";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineOppositeContent from "@mui/lab/TimelineOppositeContent";
import TimelineDot from "@mui/lab/TimelineDot";
import { Box, Typography } from "@mui/material";

// Types
import { Ancestor, MeshObject } from "@/lib/types/modules/modelViewer";

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
      <Box sx={{ paddingLeft: "2.5rem" }}>
        <Typography variant="body1">
          The model hierarchy lists the complete ancestry of the selected object
        </Typography>
      </Box>

      <br />
      <Timeline position={"left"}>
        {ancestry
          ? ancestry.map((ancestor: Ancestor) => {
              return (
                <TimelineItem key={ancestor.NodeId}>
                  <TimelineOppositeContent sx={{ flex: 0.5 }}>
                    <Typography variant="body2">
                      {ancestor.Name.toLowerCase()}
                    </Typography>
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot color="primary" />
                    <TimelineConnector />
                  </TimelineSeparator>
                  <TimelineContent
                    sx={{
                      flex: 0.175,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "start",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="caption">
                        NodeID: {ancestor.NodeId}
                      </Typography>
                    </Box>
                  </TimelineContent>
                </TimelineItem>
              );
            })
          : null}
        <TimelineItem>
          <TimelineOppositeContent sx={{ flex: 0.5 }} typography={"body2"}>
            {assembly.Name.toLowerCase()}
          </TimelineOppositeContent>
          <TimelineSeparator>
            <TimelineDot color="primary" />
          </TimelineSeparator>
          <TimelineContent
            sx={{
              flex: 0.175,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "start",
                alignItems: "center",
              }}
            >
              <Typography variant="caption">
                NodeID: {assembly.NodeId}
              </Typography>
            </Box>
          </TimelineContent>
        </TimelineItem>
      </Timeline>
    </>
  );
}
