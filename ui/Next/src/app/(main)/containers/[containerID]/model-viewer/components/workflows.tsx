"use client";

// Hooks
import { useState, useEffect } from "react";

// Types
import { NodeT, FileT, ContainerT } from "@/lib/types/deeplynx";

// MUI
import { Tab, Tabs, Typography } from "@mui/material";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// Components
import UploadModel from "./workflows/uploadModel";
import ProcessModel from "./workflows/processFiles";
import VisualizeModel from "./workflows/visualizeModel";

// Functions
import { fetchFiles } from "@/lib/client";

const Workflows = () => {
  // Component Hooks
  const [files, setFiles] = useState<Array<FileT> | undefined>();
  const [tab, setTab] = useState<string>("upload");

  const container: ContainerT = useAppSelector(
    (state) => state.container.container!
  );

  useEffect(() => {
    const get = async () => {
      await fetchFiles(container.id).then((files) => {
        setFiles(files);
      });
    };

    if (container.id) {
      get();
    }
  }, [container]);

  // Handlers
  const handleTab = (event: React.SyntheticEvent, tab: string) => {
    setTab(tab);
  };

  return (
    <>
      <Typography variant="body2">
        Select a file action to get started.
      </Typography>
      <br />
      <Tabs value={tab} onChange={handleTab}>
        <Tab label="Upload Model" value={"upload"}></Tab>
        <Tab label="Process Model" value={"process"}></Tab>
        <Tab label="Visualize Model" value={"visualize"}></Tab>
      </Tabs>
      <br />
      {tab === "upload" ? <UploadModel /> : null}
      {tab === "process" ? <ProcessModel files={files} /> : null}
      {tab === "visualize" ? <VisualizeModel files={files} /> : null}
    </>
  );
};

export default Workflows;
