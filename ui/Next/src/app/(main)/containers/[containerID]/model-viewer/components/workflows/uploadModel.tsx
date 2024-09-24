"use client";

// Hooks
import { useState, ChangeEvent } from "react";

// MUI
import { Button, Input } from "@mui/material";

// Helpers
import { supportedFiletypes } from "../../supportedFileTypes";

// Styles
import { classes } from "@/app/styles";

const UploadModel = () => {
  const [file, setFile] = useState<File | undefined>();

  return (
    <>
      <Input
        type="file"
        inputProps={{
          accept: supportedFiletypes,
        }}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          if (event.target.files) {
            console.log(event.target.files[0]);
          }
        }}
      />
      <br />
      <br />
      <Button className={classes.button}>Upload</Button>
    </>
  );
};

export default UploadModel;
