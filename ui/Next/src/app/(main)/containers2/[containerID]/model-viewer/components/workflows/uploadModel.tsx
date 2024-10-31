"use client";

// Hooks
import { useState, ChangeEvent, useEffect } from "react";

// MUI
import { Button, Input } from "@mui/material";

// Helpers
import { supportedFiletypes } from "../../supportedFileTypes";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// Styles
import { classes } from "@/app/styles";

// Functions
import { uploadFile } from "@/lib/client";

// Types
import { ContainerT, DataSourceT } from "@/lib/types/deeplynx";

const UploadModel = () => {
  const container: ContainerT = useAppSelector(
    (state) => state.container.container!
  );
  const dataSource: DataSourceT = useAppSelector(
    (state) => state.container.dataSource!
  );
  const [file, setFile] = useState<File | undefined>();
  const [status, setStatus] = useState<boolean | undefined>();

  const handleFile = async () => {
    await uploadFile(file!, container.id!, dataSource.id!).then((response) => {
      console.log(response);
    });
  };

  return (
    <>
      <Input
        type="file"
        // inputProps={{
        //   accept: supportedFiletypes,
        // }}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files![0];
          setFile(file);
        }}
      />
      <br />
      <br />
      {file ? (
        <Button className={classes.button} onClick={handleFile}>
          Upload
        </Button>
      ) : null}
    </>
  );
};

export default UploadModel;
