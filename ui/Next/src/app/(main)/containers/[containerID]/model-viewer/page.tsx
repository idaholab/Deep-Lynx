"use client";

// Hooks
import { useState } from "react";

// Components
import Workflows from "./components/workflows";

// Types
import { Typography } from "@mui/material";

// MUI
import { Box, Button, Container, Divider, Grid } from "@mui/material";

// Icons
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

// Filetypes
import { supportedFiletypes } from "./supportedFileTypes";
import { classes } from "@/app/styles";

const ModelViewer = () => {
  const [expand, setExpand] = useState<boolean>(false);

  const handleExpand = () => {
    setExpand(!expand);
  };

  return (
    <>
      <Grid container spacing={4} className={classes.grid}>
        <Grid item xs={2}>
          <Button onClick={handleExpand} className={classes.button}>
            {expand ? (
              <KeyboardArrowDownIcon sx={{ paddingBottom: ".15rem" }} />
            ) : (
              <KeyboardArrowRightIcon sx={{ paddingBottom: ".15rem" }} />
            )}
            <Typography variant="caption">Supported file extensions</Typography>
          </Button>
          <Box
            sx={{
              maxHeight: "75vh",
              overflowY: expand ? "scroll" : "unset",
            }}
          >
            <br />
            {expand ? (
              <Box>
                <Typography variant="caption">
                  {supportedFiletypes.sort().map((type) => {
                    return (
                      <Box key={type} sx={{ whiteSpace: "nowrap" }}>
                        {type}
                      </Box>
                    );
                  })}
                </Typography>
              </Box>
            ) : null}
          </Box>
        </Grid>
        <Grid item xs={10}>
          <Box sx={{ width: "50%" }}>
            <Typography variant="body2">
              Select a file attached to a node in DeepLynx, and transform it
              into an interactive model.
              <br />
              <br />
              Behind the scenes, a DeepLynx module extracts metadata from the
              geometry in your model, and transforms the geometry into a .glb.
              <br />
              <br />
            </Typography>
            <br />
            <Divider />
            <br />
            <Workflows />
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default ModelViewer;
