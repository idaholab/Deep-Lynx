"use client";

// Hooks
import { useFiles } from "../../hooks/useFiles";
import { SyntheticEvent, useState } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// MUI
import {
  Box,
  Button,
  InputLabel,
  FormControl,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";

// Icons
import CloudSyncIcon from "@mui/icons-material/CloudSync";

// Store
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { modelViewerActions } from "@/lib/store/features/model-viewer/modelViewerSlice";

// Filetypes
import { supportedFiletypes } from "../../supportedFileTypes";

// Axios
import axios from "axios";

// Types
import { NodeT, FileT, DagT } from "@/lib/types/deeplynx";
import { SelectChangeEvent } from "@mui/material";
type Props = {
  node: NodeT;
};

const ProcessModel = (props: Props) => {
  // Component Hooks
  const [file, setFile] = useState<FileT | undefined>();

  // Redux Hooks
  const storeDispatch = useAppDispatch();
  const dataSource = useAppSelector((state) => state.container.dataSource!);

  // DeepLynx Hooks
  const container = useContainer();
  const files = useFiles(props.node);

  // Handlers
  const handleFile = (event: SelectChangeEvent) => {
    setFile(files!.find((file: FileT) => file.id === event.target.value)!);
  };
  const handlePixyz = async (event: SyntheticEvent) => {
    await axios
      .get("/api/pythagoras", {
        params: {
          containerId: container.id,
          dataSourceId: dataSource.id,
          dataSourceName: dataSource.name,
          nodeId: props.node!.id,
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
  );
};

export default ProcessModel;
