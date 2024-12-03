"use client";

// Hooks
import { useContainer } from "@/lib/context/ContainerProvider";

// MUI
import { Container, Typography } from "@mui/material";

// Styles
import { classes } from "@/app/styles";
import Wireframe from "@/app/_wireframe/wireframe";

const ContainerDashboard = () => {
  // This hook initiates API calls that bring in container data from DeepLynx
  const container = useContainer();

  return (
    <>
     <Wireframe/>

    </>
  );
};

export default ContainerDashboard;
