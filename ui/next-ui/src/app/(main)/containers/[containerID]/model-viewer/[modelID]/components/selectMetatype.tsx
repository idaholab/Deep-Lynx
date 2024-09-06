"use client";

// Hooks
import { useState } from "react";
import { useNodeMetatypes } from "../../hooks/useNodeMetatypes";

// MUI
import {
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";

// Store
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { modelViewerActions } from "@/lib/store/features/model-viewer/modelViewerSlice";

// Types
import { MetatypeT } from "@/lib/types";
import { SelectChangeEvent } from "@mui/material";

function SelectMetatype() {
  // Hooks
  const mappings = useAppSelector((state) => state.modelViewer.mappings);
  const nodeMetatypes = useNodeMetatypes();

  const storeDispatch = useAppDispatch();

  const handleMetatypes = (event: SelectChangeEvent<typeof mappings>) => {
    const {
      target: { value },
    } = event;

    // On autofill we get a stringified value.
    let metatypes = typeof value === "string" ? value.split(",") : value;
    storeDispatch(modelViewerActions.setMappings(metatypes));
  };

  return (
    <>
      <Typography variant="subtitle1">Select a Class</Typography>
      <Typography variant="body2">
        Choose classes to view nodes in the DeepLynx graph related to your
        engineering model
      </Typography>
      <br />
      <FormControl sx={{ width: "100%" }}>
        <InputLabel>Class</InputLabel>
        <Select
          label={"Class"}
          multiple
          onChange={handleMetatypes}
          value={mappings}
        >
          {nodeMetatypes
            ? nodeMetatypes.map((metatype: MetatypeT) => {
                return (
                  <MenuItem key={metatype.id} value={metatype.name}>
                    {metatype.name}
                  </MenuItem>
                );
              })
            : null}
        </Select>
      </FormControl>
    </>
  );
}

export default SelectMetatype;
