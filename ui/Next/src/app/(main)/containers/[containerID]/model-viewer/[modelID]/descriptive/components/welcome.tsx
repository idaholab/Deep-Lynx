"use client";

// MUI
import { Button, Container, Typography } from "@mui/material";

// Styles
import { classes } from "@/app/styles";

// Types
type PropsT = {
  setStart: Function;
};

export default function Welcome(props: PropsT) {
  const setStart = props.setStart;

  return (
    <>
      <Container>
        <Typography variant="h4">
          Welcome to the DeepLynx Model Viewer
        </Typography>
        <br />
        <Typography variant="body1">
          Your 3D model has been transformed and is available in the Unity game.
          <br />
          <br />
          Click <Typography variant="button">START VIEWER</Typography> to launch
          the game.
        </Typography>
        <br />
        <Typography variant="body1">
          You can optionally for related nodes in DeepLynx by expanding the{" "}
          <Typography variant="button">UPDATE GRAPH QUERY</Typography> button in
          the bottom left corner. Select one or more class types in the ontology
          to search for.
        </Typography>
        <br />
        <br />
        <Button onClick={() => setStart(true)}>Start Viewer</Button>
      </Container>
    </>
  );
}
