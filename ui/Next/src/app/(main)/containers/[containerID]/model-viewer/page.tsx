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
      <Container className={classes.container} maxWidth={false}>
        <Grid container spacing={4} className={classes.grid}>
          <Grid item xs={2}>
            <Button onClick={handleExpand} className={classes.button}>
              {expand ? (
                <KeyboardArrowDownIcon sx={{ paddingBottom: ".15rem" }} />
              ) : (
                <KeyboardArrowRightIcon sx={{ paddingBottom: ".15rem" }} />
              )}
              <Typography variant="caption">
                Supported file extensions
              </Typography>
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
          <Grid item xs={5}>
            <Typography variant="h4">Choose a Model</Typography>
            <br />
            <Typography variant="body2">
              Behind the scenes, DeepLynx extracts metadata from the model, and
              transforms the it into a digital twin.
            </Typography>
            <br />
            <Divider />
            <br />
            <Workflows />
          </Grid>
          <Grid item xs={5}>
            <Typography variant="h4">Type Mapping</Typography>
            <br />
            <Typography variant="body2">
              Develop a type mapping to simplify your model and manage the
              digital twin
            </Typography>
            <br />
            <Divider />
            <br />
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default ModelViewer;
