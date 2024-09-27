"use client";

// Hooks
import { useWebglMetatypes } from "../../hooks/useWebglMetatypes";

// MUI
import {
  Box,
  Button,
  Dialog,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";

// Store
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { modelViewerActions } from "@/lib/store/features/model-viewer/modelViewerSlice";

// Style
import { classes } from "@/app/styles";

// Icons
import CloseIcon from "@mui/icons-material/Close";

// Types
import { MetatypeT } from "@/lib/types/deeplynx";
import { SelectChangeEvent } from "@mui/material";

type Props = {
  open: boolean;
  setOpen: Function;
};

function MetatypeDialog(props: Props) {
  // Hooks
  const webglMetatypes = useWebglMetatypes();
  const mappings = useAppSelector((state) => state.modelViewer.mappings);

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
        <Box
          sx={{ display: "flex", justifyContent: "start", padding: ".5rem" }}
        >
          <Button onClick={() => setOpen(false)}>
            <CloseIcon />
          </Button>
        </Box>
        <Box sx={{ padding: "1rem 2.5rem 2.5rem 2.5rem" }}>
          <Typography variant="subtitle1">Select Classes</Typography>
          <Typography variant="body2">
            Choose one or more classes to view nodes in the DeepLynx graph
            related to your engineering model.
            <br />
            You can select multiple classes and the model will return any
            related nodes belonging to these classes.
          </Typography>
          <br />
          {webglMetatypes ? (
            <FormControl sx={{ width: "100%" }}>
              <InputLabel>Classes</InputLabel>
              <Select
                label={"Classes"}
                multiple
                onChange={handleMetatypes}
                value={mappings}
              >
                {webglMetatypes.map((metatype: MetatypeT) => {
                  return (
                    <MenuItem key={metatype.id} value={metatype.name}>
                      {metatype.name}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          ) : (
            <LinearProgress />
          )}
        </Box>
        <Box sx={{ display: "flex", justifyContent: "end", padding: "1.5rem" }}>
          <Button onClick={() => setOpen(false)} classes={classes.button}>
            Apply
          </Button>
        </Box>
      </Dialog>
    </>
  );
}

export default MetatypeDialog;
