"use client";

// Hooks
import { useEffect, useState } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// Components
import Files from "./components/files";

// Types
import { ContainerT, FileT, NodeT } from "@/lib/types";
import { SelectChangeEvent, Typography } from "@mui/material";

// MUI
import {
  Box,
  Button,
  Divider,
  Container,
  Input,
  Tab,
  Tabs,
} from "@mui/material";

// Translations
import translations from "@/lib/translations";

// Filetypes
import { supportedFiletypes } from "./fileTypes";

const ModelViewer = () => {
  // Store
  const container: ContainerT = useContainer();

  // Hooks
  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [tab, setTab] = useState<string>("upload");

  // Handlers
  const handleTab = (event: React.SyntheticEvent, tab: string) => {
    setTab(tab);
  };

  useEffect(() => {
    async function fetchNodes() {
      let nodes = await fetch(
        `/api/containers/${container.id}/graphs/nodes`
      ).then((response) => {
        return response.json();
      });

      setNodes(nodes);
    }

    if (container?.id) {
      fetchNodes();
    }
  }, [container.id]);

  return (
    <>
      <Container>
        <Box sx={{ width: "50%" }}>
          <Typography variant="body2">
            Select a file attached to a node in DeepLynx, and transform it into
            an interactive model.
            <br />
            <br />
            Behind the scenes, a DeepLynx module extracts metadata from the
            geometry in your model, and transforms the geometry into a .glb.
            <br />
            <br />
            <Typography variant="caption">
              Supported file extensions are: <br /> {supportedFiletypes.sort()}
            </Typography>
          </Typography>
          <br />
          <Divider />
          <br />
          {nodes ? <Files nodes={nodes} /> : null}
        </Box>
      </Container>
    </>
  );
};

export default ModelViewer;
