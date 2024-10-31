"use client";

// Hooks
import { useNodes } from "../hooks/useNodes";
import { useState } from "react";

// Types
import { NodeT } from "@/lib/types/deeplynx";
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
import NodeSelector from "./selectNode";
import UploadModel from "./workflows/uploadModel";
import ProcessModel from "./workflows/processFiles";
import VisualizeModel from "./workflows/visualizeModel";

const Workflows = () => {
  // Component Hooks
  const [node, setNode] = useState<NodeT | undefined>(undefined);
  const [tab, setTab] = useState<string>("upload");

  // Redux Hooks
  const dataSource = useAppSelector((state) => state.container.dataSource!);

  // Handlers
  const handleTab = (event: React.SyntheticEvent, tab: string) => {
    setTab(tab);
  };

  return (
    <>
      <DataSourceSelector />
      <br />
      <br />
      {dataSource ? (
        <NodeSelector dataSource={dataSource} node={node} setNode={setNode} />
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
            {/* <Tab label="Upload Model" value={"upload"}></Tab> */}
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
