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
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

// Icons
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import StartIcon from "@mui/icons-material/Start";

// Translations
import translations from "@/lib/translations";

// Filetypes
import { supportedFiletypes } from "../fileTypes";

// Axios
import axios from "axios";

type Props = {
  nodes: NodeT[];
};

const Files = (props: Props) => {
  // Hooks
  const [selectedNode, setSelectedNode] = useState<NodeT>({ id: "" } as NodeT);
  const [files, setFiles] = useState<FileT[]>([]);
  const [tab, setTab] = useState<string>("upload");
  const [selectedFile, setSelectedFile] = useState<FileT>({ id: "" } as FileT);
  const fileToggle = useState<boolean>(false);
  const container = useContainer();

  useEffect(() => {
    async function fetchFiles() {
      let files = await fetch(
        `/api/containers/${container!.id}/graphs/nodes/${
          selectedNode!.id
        }/files`
      ).then((response) => {
        return response.json();
      });
      setFiles(files);
    }

    if (selectedNode.id) {
      fetchFiles();
    }
  }, [selectedNode, container]);

  // Handlers
  const handleNode = (event: SelectChangeEvent) => {
    setSelectedNode(
      props.nodes.find((node) => node.id === event.target.value)!
    );
  };
  const handleFile = (event: SelectChangeEvent) => {
    setSelectedFile(files.find((file) => file.id === event.target.value)!);
  };
  const handleTab = (event: React.SyntheticEvent, tab: string) => {
    setSelectedFile({ id: "" } as FileT);
    setTab(tab);
  };
  const handlePixyz = async (event: SyntheticEvent) => {
    await axios.get("/api/pythagoras", {
      params: {
        containerId: container.id,
        dataSourceId: selectedNode!.data_source_id,
        nodeId: selectedNode!.id,
        fileId: selectedFile!.id,
      },
    });
  };

  return (
    <>
      <FormControl fullWidth>
        <InputLabel id="Node Select">Nodes</InputLabel>
        <Select
          labelId="Node Select"
          id="/model-viewer/components/SelectFile/node"
          label="Nodes"
          value={selectedNode?.id}
          onChange={handleNode}
        >
          {props.nodes
            ? props.nodes.map((node: NodeT) => {
                return (
                  <MenuItem key={node.id} value={node.id}>
                    {JSON.stringify(node.properties)}
                  </MenuItem>
                );
              })
            : null}
        </Select>
      </FormControl>
      <br />
      <br />
      <br />
      {selectedNode ? (
        <>
          <Typography variant="body2">
            Select a file action for files attached to this node
          </Typography>
          <br />
          <Tabs value={tab} onChange={handleTab}>
            <Tab label="Upload File" value={"upload"}></Tab>
            <Tab label="Process File" value={"process"}></Tab>
            <Tab label="Visualize File" value={"visualize"}></Tab>
          </Tabs>
        </>
      ) : null}
      <br />
      {tab === "process" ? (
        <>
          <Typography variant="body2">
            Select a file for DeepLynx to process
          </Typography>
          <br />
          <FormControl fullWidth>
            <InputLabel id="Process File">Files</InputLabel>
            <Select
              labelId="Process File"
              id="/model-viewer/components/files/select_process"
              label="Files"
              value={selectedFile.id}
              onChange={handleFile}
            >
              {files.map((file: FileT) => {
                // Test for file extensions. If the file doesn't have a file extension, we can't know whether its eligible for transformation, so return
                if (!file.file_name.split(".")[1]) return;

                // Grab the file extension
                let extension = /\.([^.]+)$/.exec(file.file_name)![0];

                // If the file extension is in the supported filetypes array, its eligible for transformation
                if (
                  supportedFiletypes.includes(extension.toLocaleLowerCase())
                ) {
                  return (
                    <MenuItem key={file.id} value={file.id}>
                      {JSON.stringify(file)}
                    </MenuItem>
                  );
                }
              })}
            </Select>
          </FormControl>
        </>
      ) : null}
      {tab === "visualize" ? (
        <>
          <Typography variant="body2">
            Select a processed file to visualize in the DeepLynx Model Viewer
          </Typography>
          <br />
          <FormControl fullWidth>
            <InputLabel id="Visualize File">Files</InputLabel>
            <Select
              labelId="Visualize File"
              id="/model-viewer/components/files/visualize_file"
              label="Files"
              value={selectedFile.id}
              onChange={handleFile}
            >
              {files.map((file: FileT) => {
                const glb = /\.glb$/.test(file.file_name);
                if (glb) {
                  return (
                    <MenuItem key={file.id} value={file.id}>
                      {JSON.stringify(file)}
                    </MenuItem>
                  );
                }
              })}
            </Select>
          </FormControl>
        </>
      ) : null}
      <br />
      <br />
      {selectedFile.id ? (
        <>
          <Typography variant="body1">
            File Selected: {selectedFile.file_name}
          </Typography>
          <br />
          <Button onClick={() => handlePixyz} startIcon={<CloudSyncIcon />}>
            Start Processing
          </Button>
        </>
      ) : null}
    </>
  );
};

export default Files;
