"use client";

// Hooks
import { useEffect, useState } from "react";

// Types
import { ContainerT, FileT } from "@/lib/types/deeplynx";
import { SelectChangeEvent } from "@mui/material";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// MUI
import {
  Box,
  InputLabel,
  FormControl,
  LinearProgress,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

// Functions
import { fetchFiles } from "@/lib/client";

const FileSelector = () => {
  const [files, setFiles] = useState<Array<FileT> | undefined>();
  const [file, setFile] = useState<FileT | undefined>();

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

  const handleFile = (event: SelectChangeEvent) => {
    let file: FileT = files!.find(
      (file: FileT) => file.id === event.target.value
    )!;
    setFile(file);
  };

  return (
    <>
      <Typography variant="subtitle2">Select a File</Typography>
      {files ? (
        <FormControl sx={{ width: "100%" }}>
          <Select
            labelId="File Select"
            id="_wireframe/components/fileSelector.tsx"
            value={file ? file.id : ""}
            onChange={handleFile}
          >
            {files.map((file: FileT) => {
              return (
                <MenuItem key={file.id} value={file.id}>
                  <Typography variant="caption" sx={{ color: "grey" }}>
                    ID: {file.id}
                  </Typography>
                  <Box flexGrow={1} />
                  <Typography variant="subtitle1">
                    {JSON.stringify(file.file_name)}
                  </Typography>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      ) : (
        <Box sx={{ width: "100%" }}>
          <LinearProgress />
        </Box>
      )}
    </>
  );
};

export default FileSelector;
