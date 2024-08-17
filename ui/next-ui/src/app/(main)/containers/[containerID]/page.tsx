"use client";

// Hooks
import { useContainer } from "@/lib/context/ContainerProvider";

// MUI
import { Typography } from "@mui/material";

const ContainerDashboard = () => {
  // This hook initiates API calls that bring in container data from DeepLynx
  const container = useContainer();

  return (
    <>
      <Typography variant="h2">{container.name} Dashboard</Typography>
    </>
  );
};

export default ContainerDashboard;
