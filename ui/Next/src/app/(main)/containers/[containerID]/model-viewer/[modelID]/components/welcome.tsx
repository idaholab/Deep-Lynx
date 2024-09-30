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
          Click <Typography variant="button">START VIEWER</Typography> to launch
          the game.
        </Typography>
        <br />
        <Typography variant="body1">
          You can optionally expand the floating{" "}
          <Typography variant="button">+</Typography> button in the bottom left
          corner to query for related nodes in DeepLynx.
        </Typography>
        <br />
        <br />
        <Button onClick={() => setStart(true)}>Start Viewer</Button>
      </Container>
    </>
  );
}
