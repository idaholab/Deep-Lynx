"use client";

// Hooks
import { useFiles } from "../hooks/files";
import { useNodes } from "../hooks/nodes";
import { SyntheticEvent, useState } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";
import { useRouter } from "next/navigation";

// Types
import { NodeT, FileT, DagT } from "@/lib/types";
import { SelectChangeEvent } from "@mui/material";

// MUI
import {
  Box,
  Button,
  InputLabel,
  FormControl,
  Input,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

// Icons
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import ViewInArIcon from "@mui/icons-material/ViewInAr";

// Store
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { modelViewerActions } from "@/lib/store/features/model-viewer/modelViewerSlice";

// Filetypes
import { supportedFiletypes } from "../supportedFileTypes";

// Axios
import axios from "axios";

// Components
import DataSourceSelector from "../components/selectDataSource";

const ProcessFiles = () => {
  // Component Hooks
  const [file, setFile] = useState<FileT | undefined>();
  const [node, setNode] = useState<NodeT | undefined>();
  const [tab, setTab] = useState<string>("upload");

  // Redux Hooks
  const storeDispatch = useAppDispatch();
  const dataSource = useAppSelector((state) => state.container.dataSource!);

  // DeepLynx Hooks
  const container = useContainer();
  const nodes = useNodes(dataSource);
  const files = useFiles(node);

  // Next Hooks
  const router = useRouter();

  // Handlers
  const handleNode = (event: SelectChangeEvent) => {
    let node: NodeT = nodes!.find(
      (node: NodeT) => node.id === event.target.value
    )!;
    setNode(node);
  };
  const handleFile = (event: SelectChangeEvent) => {
    setFile(files!.find((file: FileT) => file.id === event.target.value)!);
  };
  const handleVisualize = () => {
    storeDispatch(modelViewerActions.setFile(file!));
    router.push(`/containers/${container.id}/model-viewer/${file!.id}`);
  };
  const handleTab = (event: React.SyntheticEvent, tab: string) => {
    setFile(undefined);
    setTab(tab);
  };
  const handlePixyz = async (event: SyntheticEvent) => {
    await axios
      .get("/api/pythagoras", {
        params: {
          containerId: container.id,
          dataSourceId: dataSource.id,
          dataSourceName: dataSource.name,
          nodeId: node!.id,
          fileId: file!.id,
          fileName: file!.file_name,
        },
      })
      .then((response) => {
        let dag: DagT = response.data;
        storeDispatch(modelViewerActions.setDag(dag));
      });
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
                <InputLabel id="Process Model">Models</InputLabel>
                <Select
                  labelId="Process Model"
                  id="/model-viewer/workflows/process_files/process_model"
                  label="Models"
                  value={file ? file.id : ""}
                  onChange={handleFile}
                >
                  {files
                    ? files.map((file: FileT) => {
                        // Test for file extensions. If the file doesn't have a file extension, we can't know whether its eligible for transformation, so return
                        if (!file.file_name.split(".")[1]) return;

                        // Grab the file extension
                        let extension = /\.([^.]+)$/.exec(file.file_name)![0];

                        // If the file extension is in the supported filetypes array, its eligible for transformation
                        if (
                          supportedFiletypes.includes(
                            extension.toLocaleLowerCase()
                          )
                        ) {
                          return (
                            <MenuItem key={file.id} value={file.id}>
                              <Typography
                                variant="caption"
                                sx={{ color: "grey" }}
                              >
                                ID: {file.id}
                              </Typography>
                              <Box flexGrow={1} />
                              <Typography variant="subtitle1">
                                {file.file_name}
                              </Typography>
                            </MenuItem>
                          );
                        }
                      })
                    : null}
                </Select>
              </FormControl>
              <br />
              <br />
              {file ? (
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button onClick={handlePixyz} startIcon={<CloudSyncIcon />}>
                    Process Model
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
                <InputLabel id="Visualize Model">Models</InputLabel>
                <Select
                  labelId="Visualize Model"
                  id="/model-viewer/workflows/process_files/visualize_model"
                  label="Models"
                  value={file ? file.id : ""}
                  onChange={handleFile}
                >
                  {files
                    ? files.map((file: FileT) => {
                        const glb = /\.glb$/.test(file.file_name);
                        if (glb) {
                          return (
                            <MenuItem key={file.id} value={file.id}>
                              <Typography
                                variant="caption"
                                sx={{ color: "grey" }}
                              >
                                ID: {file.id}
                              </Typography>
                              <Box flexGrow={1} />
                              <Typography variant="subtitle1">
                                {file.file_name}
                              </Typography>
                            </MenuItem>
                          );
                        }
                      })
                    : null}
                </Select>
              </FormControl>
              <br />
              <br />
              {file ? (
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    startIcon={<ViewInArIcon />}
                    onClick={handleVisualize}
                  >
                    Visualize Model
                  </Button>
                </Box>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
};

export default ProcessFiles;
