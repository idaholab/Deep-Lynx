// MUI
import { Input } from "@mui/material";

import { supportedFiletypes } from "../../supportedFileTypes";

const UploadModel = () => {
  return (
    <>
      <Input
        type="file"
        inputProps={{
          accept: supportedFiletypes,
        }}
      ></Input>
    </>
  );
};

export default UploadModel;
