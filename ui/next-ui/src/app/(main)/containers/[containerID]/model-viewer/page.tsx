"use client";

// Hooks
import { useEffect, useState } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// Components
import Files from "./components/files";

// Types
import { ContainerT, FileT, NodeT } from "@/lib/types";
import { SelectChangeEvent, Typography } from "@mui/material";

// MUI
import {
  Box,
  Button,
  Divider,
  Container,
  Grid,
  Input,
  Tab,
  Tabs,
} from "@mui/material";

// Icons
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

// Translations
import translations from "@/lib/translations";

// Filetypes
import { supportedFiletypes } from "./supportedFileTypes";
import Nodes from "./components/nodes";

const ModelViewer = () => {
  // Store
  const container: ContainerT = useContainer();

  // Hooks
  const [tab, setTab] = useState<string>("");
  const [expand, setExpand] = useState<boolean>(false);

  // Handlers
  const handleTab = (event: React.SyntheticEvent, tab: string) => {
    setTab(tab);
  };

  const handleExpand = () => {
    setExpand(!expand);
  };

  return (
    <>
      <Grid container spacing={4}>
        <Grid item xs={2}>
          <Button onClick={handleExpand}>
            {expand ? (
              <>
                <KeyboardArrowDownIcon sx={{ paddingBottom: ".15rem" }} />{" "}
                <Typography variant="caption">
                  Supported file extensions
                </Typography>
              </>
            ) : (
              <>
                <KeyboardArrowRightIcon sx={{ paddingBottom: ".15rem" }} />{" "}
                <Typography variant="caption">
                  Supported file extensions
                </Typography>
              </>
            )}
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
            <Tabs value={tab} onChange={handleTab}>
              <Tab label="Create Node" value={"create"}></Tab>
              <Tab label="Select Node" value={"select"}></Tab>
            </Tabs>
            <br />
            <Divider />
            <br />
            {tab == "create" ? <Nodes /> : null}
            {tab == "select" ? <Files /> : null}
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default ModelViewer;
