"use client";

// Hooks
import { useContainer } from "@/lib/context/ContainerProvider";

// MUI
import { Container, Typography } from "@mui/material";

// Styles
import { classes } from "@/app/styles";

const ContainerDashboard = () => {
  // This hook initiates API calls that bring in container data from DeepLynx
  const container = useContainer();

  return (
    <>
      <Container className={classes.container}>
        {container ? (
          <Typography variant="h2">{container.name} Dashboard</Typography>
        ) : null}
      </Container>
    </>
  );
};

export default ContainerDashboard;
