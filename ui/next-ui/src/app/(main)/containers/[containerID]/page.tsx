"use client";

// Hooks
import { useContainer } from "@/lib/context/ContainerProvider";

// MUI
import { Typography } from "@mui/material";

const ContainerDashboard = () => {
  // This hook initiates API calls that bring in container data from DeepLynx
  useContainer();

  return (
    <>
      <Typography variant="h2">Welcome to the container dashboard!</Typography>
    </>
  );
};

export default ContainerDashboard;
