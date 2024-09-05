"use client";

// Hooks
import { useNodes } from "../hooks/useNodes";
import { useState } from "react";

// Types
import { NodeT } from "@/lib/types";
import { SelectChangeEvent } from "@mui/material";

// MUI
import {
  Box,
  InputLabel,
  FormControl,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// Components
import DataSourceSelector from "./selectDataSource";
import UploadModel from "./workflows/uploadModel";
import ProcessModel from "./workflows/processFiles";
import VisualizeModel from "./workflows/visualizeModel";

const Workflows = () => {
  // Component Hooks
  const [node, setNode] = useState<NodeT | undefined>();
  const [tab, setTab] = useState<string>("upload");

  // Redux Hooks
  const dataSource = useAppSelector((state) => state.container.dataSource!);

  // DeepLynx Hooks
  const nodes = useNodes(dataSource);

  // Handlers
  const handleNode = (event: SelectChangeEvent) => {
    let node: NodeT = nodes!.find(
      (node: NodeT) => node.id === event.target.value
    )!;
    setNode(node);
  };
  const handleTab = (event: React.SyntheticEvent, tab: string) => {
    setTab(tab);
  };

  return (
    <>
      <DataSourceSelector />
      <br />
      <br />
      {nodes ? (
        <FormControl fullWidth>
          <InputLabel id="Node Select">Nodes</InputLabel>
          <Select
            labelId="Node Select"
            id="/model-viewer/components/SelectFile/node"
            label="Nodes"
            value={node ? node.id : ""}
            onChange={handleNode}
          >
            {nodes.map((node: NodeT) => {
              return (
                <MenuItem key={node.id} value={node.id}>
                  <Typography variant="caption" sx={{ color: "grey" }}>
                    ID: {node.id}
                  </Typography>
                  <Box flexGrow={1} />
                  <Typography variant="subtitle1">
                    {JSON.stringify(node.properties)}
                  </Typography>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      ) : null}
      <br />
      <br />
      {node ? (
        <>
          <Typography variant="body2">
            Select a file action for files attached to this node
          </Typography>
          <br />
          <Tabs value={tab} onChange={handleTab}>
            <Tab label="Upload Model" value={"upload"}></Tab>
            <Tab label="Process Model" value={"process"}></Tab>
            <Tab label="Visualize Model" value={"visualize"}></Tab>
          </Tabs>
          <br />
          {tab === "upload" ? <UploadModel /> : null}
          {tab === "process" ? <ProcessModel node={node} /> : null}
          {tab === "visualize" ? <VisualizeModel node={node} /> : null}
        </>
      ) : null}
    </>
  );
};

export default Workflows;
