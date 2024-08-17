"use client";

// Hooks
import { SyntheticEvent, useEffect, useState } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// Types
import { NodeT, FileT } from "@/lib/types";
import { SelectChangeEvent } from "@mui/material";

// MUI
import {
  Box,
  Button,
  InputLabel,
  FormControl,
  Grid,
  Input,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

// Translations
import translations from "@/lib/translations";

// Axios
import axios from "axios";

// Components
import CreateNode from "@/app/(main)/containers/[containerID]/dashboard/components/data-viewer/createNode";

const Nodes = () => {
  // Hooks
  const container = useContainer();

  return (
    <>
      <CreateNode />
    </>
  );
};

export default Nodes;
