"use client";

// Hooks
import { useNodeMetatypes } from "../../hooks/useNodeMetatypes";

// MUI
import {
  Box,
  Dialog,
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
import { MetatypeT } from "@/lib/types/deeplynx";
import { SelectChangeEvent } from "@mui/material";

type Props = {
  open: boolean;
  setOpen: Function;
};

function MetatypeDialog(props: Props) {
  // Hooks
  const mappings = useAppSelector((state) => state.modelViewer.mappings);
  const nodeMetatypes = useNodeMetatypes();

  // Props
  const open = props.open;
  const setOpen = props.setOpen;

  // Store
  const storeDispatch = useAppDispatch();

  // Handlers
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
      <Dialog open={open} onClose={() => setOpen(false)}>
        <Box sx={{ padding: "2.5rem" }}>
          <Typography variant="subtitle1">Select Classes</Typography>
          <Typography variant="body2">
            Choose one or more classes to view nodes in the DeepLynx graph
            related to your engineering model.
            <br />
            You can select multiple classes and the model will return any
            related nodes belonging to these classes.
          </Typography>
          <br />
          <FormControl sx={{ width: "100%" }}>
            <InputLabel>Classes</InputLabel>
            <Select
              label={"Classes"}
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
        </Box>
      </Dialog>
    </>
  );
}

export default MetatypeDialog;
