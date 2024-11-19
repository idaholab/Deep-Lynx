// MUI
import { Box, Divider, Grid, ListItem, Typography } from "@mui/material";

// Types
import { MeshObject } from "@/lib/types/modules/modelViewer";

type PropsT = {
  mesh: MeshObject;
};

export default function Metadata(props: PropsT) {
  const mesh = props.mesh;

  return (
    <>
      {Object.entries(mesh.Assembly.Metadata).map(([key, value]) => {
        return (
          <Box key={key} sx={{ paddingLeft: "2.5rem" }}>
            <ListItem>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography
                    variant="caption"
                    fontWeight={"bold"}
                    sx={{ wordWrap: "break-word" }}
                  >
                    {key.toLowerCase()}
                  </Typography>
                </Grid>
                <Grid
                  item
                  xs={8}
                  sx={{
                    display: "flex",
                    justifyContent: "end",
                  }}
                >
                  <Typography variant="caption">
                    {(value as string).replace(/['"]+/g, "")}
                  </Typography>
                </Grid>
              </Grid>
            </ListItem>
            <Divider />
          </Box>
        );
      })}
    </>
  );
}
