"use client";

// Hooks
import { SyntheticEvent, useEffect, useState } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// Types
import { NodeT, FileT, PropertyT } from "@/lib/types";
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

// Icons
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import StartIcon from "@mui/icons-material/Start";

// Translations
import translations from "@/lib/translations";

// Filetypes
import { supportedFiletypes } from "../supportedFileTypes";

// Axios
import axios from "axios";

const Files = () => {
  // Hooks
  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeT>({ id: "" } as NodeT);
  const [files, setFiles] = useState<FileT[]>([]);
  const [tab, setTab] = useState<string>("upload");
  const [selectedFile, setSelectedFile] = useState<FileT>({ id: "" } as FileT);
  const fileToggle = useState<boolean>(false);
  const container = useContainer();

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
    setSelectedNode(nodes.find((node) => node.id === event.target.value)!);
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
      {nodes ? (
        <FormControl fullWidth>
          <InputLabel id="Node Select">Nodes</InputLabel>
          <Select
            labelId="Node Select"
            id="/model-viewer/components/SelectFile/node"
            label="Nodes"
            value={selectedNode?.id}
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
      <br />
      {selectedNode.id ? (
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
          {tab === "upload" ? (
            <Input
              type="file"
              inputProps={{
                accept: supportedFiletypes,
              }}
            ></Input>
          ) : null}
          {tab === "process" ? (
            <>
              <Typography variant="body2">
                Select a file for DeepLynx to process
              </Typography>
              <br />
              <FormControl fullWidth>
                <InputLabel id="Process Model">Files</InputLabel>
                <Select
                  labelId="Process Model"
                  id="/model-viewer/components/files/process_model"
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
                          <Typography variant="caption" sx={{ color: "grey" }}>
                            ID: {file.id}
                          </Typography>
                          <Box flexGrow={1} />
                          <Typography variant="subtitle1">
                            {file.file_name}
                          </Typography>
                        </MenuItem>
                      );
                    }
                  })}
                </Select>
              </FormControl>
              <br />
              <br />
              {selectedFile.id ? (
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    onClick={() => handlePixyz}
                    startIcon={<CloudSyncIcon />}
                  >
                    Processing Model
                  </Button>
                </Box>
              ) : null}
            </>
          ) : null}
          {tab === "visualize" ? (
            <>
              <Typography variant="body2">
                Select a processed file to visualize in the DeepLynx Model
                Viewer
              </Typography>
              <br />
              <FormControl fullWidth>
                <InputLabel id="Visualize Model">Files</InputLabel>
                <Select
                  labelId="Visualize Model"
                  id="/model-viewer/components/files/visualize_model"
                  label="Models"
                  value={selectedFile.id}
                  onChange={handleFile}
                >
                  {files.map((file: FileT) => {
                    const glb = /\.glb$/.test(file.file_name);
                    if (glb) {
                      return (
                        <MenuItem key={file.id} value={file.id}>
                          <Typography variant="caption" sx={{ color: "grey" }}>
                            ID: {file.id}
                          </Typography>
                          <Box flexGrow={1} />
                          <Typography variant="subtitle1">
                            {file.file_name}
                          </Typography>
                        </MenuItem>
                      );
                    }
                  })}
                </Select>
              </FormControl>
              <br />
              <br />
              {selectedFile.id ? (
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button startIcon={<ViewInArIcon />}>Visualize Model</Button>
                </Box>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
};

export default Files;
