"use client";

// Hooks
import { useFiles } from "../../hooks/useFiles";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// MUI
import {
  Box,
  Button,
  InputLabel,
  FormControl,
  LinearProgress,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";

// Icons
import ViewInArIcon from "@mui/icons-material/ViewInAr";

// Store
import { useAppDispatch } from "@/lib/store/hooks";
import { modelViewerActions } from "@/lib/store/features/model-viewer/modelViewerSlice";

// Types
import { NodeT, FileT } from "@/lib/types/deeplynx";
import { SelectChangeEvent } from "@mui/material";
type Props = {
  node: NodeT;
};

const VisualizeModel = (props: Props) => {
  // Component Hooks
  const [file, setFile] = useState<FileT | undefined>();

  // Redux Hooks
  const storeDispatch = useAppDispatch();

  // Next Hooks
  const router = useRouter();

  // DeepLynx Hooks
  const container = useContainer();
  const files = useFiles(props.node);

  // Handlers
  const handleFile = (event: SelectChangeEvent) => {
    setFile(files!.find((file: FileT) => file.id === event.target.value)!);
  };
  const handleVisualize = () => {
    storeDispatch(modelViewerActions.setFile(file!));
    router.push(`/containers/${container.id}/model-viewer/${file!.id}`);
  };

  return (
    <>
      <Typography variant="body2">
        Select a processed model to visualize in the DeepLynx Model Viewer
      </Typography>
      <br />
      {files ? (
        <FormControl fullWidth>
          <InputLabel id="Visualize Model">Models</InputLabel>
          <Select
            labelId="Visualize Model"
            id="/model-viewer/workflows/process_files/visualize_model"
            label="Models"
            value={file ? file.id : ""}
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
      ) : (
        <Box sx={{ width: "100%" }}>
          <LinearProgress />
        </Box>
      )}

      <br />
      <br />
      {file ? (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button startIcon={<ViewInArIcon />} onClick={handleVisualize}>
            Visualize Model
          </Button>
        </Box>
      ) : null}
    </>
  );
};

export default VisualizeModel;
