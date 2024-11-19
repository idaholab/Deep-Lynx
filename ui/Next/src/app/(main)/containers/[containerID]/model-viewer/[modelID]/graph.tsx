"use client";

// Hooks
import { useState } from "react";

// MUI
import {
  Collapse,
  Card,
  CardContent,
  Container,
  Fab,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";

// Icons
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";

// Components
import MetatypeDialog from "./components/metatypes";
import Metadata from "./components/metadata";
import Ancestry from "./components/ancestry";
import Assembly from "./components/assembly";

// Styles
import { classes } from "@/app/styles";

// Types
import { MeshObject, RelatedNodeT } from "@/lib/types/modules/modelViewer";
import Edges from "./components/edges";

type Props = {
  graph: Array<RelatedNodeT> | undefined;
  mesh: MeshObject | undefined;
  selected: boolean;
  start: boolean;
};

export default function Graph(props: Props) {
  // Hooks
  const [meshExpand, setMeshExpand] = useState<boolean>(true);
  const [hierarchyExpand, setHierarchyExpand] = useState<boolean>(false);
  const [metadataExpand, setMetadataExpand] = useState<boolean>(false);
  const [dialog, setDialog] = useState<boolean>(false);

  const graph: Array<RelatedNodeT> | undefined = props.graph;
  const mesh: MeshObject | undefined = props.mesh;
  const ancestry = mesh ? [...mesh.AssemblyParents].reverse() : undefined;
  const selected: boolean = props.selected;
  const start: boolean = props.start;

  return (
    <>
      <Container>
        {selected && mesh ? (
          <>
            <Card>
              <CardContent>
                <Typography variant="h4" fontWeight={"bold"}>
                  {mesh.Assembly.Name}
                </Typography>
                <List component="div" disablePadding>
                  <ListItemButton onClick={() => setMeshExpand(!meshExpand)}>
                    <ListItemText
                      primary={"Mesh"}
                      primaryTypographyProps={{
                        fontWeight: "bold",
                      }}
                    />
                    {meshExpand ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={meshExpand} timeout="auto" unmountOnExit>
                    <Assembly mesh={mesh} />
                  </Collapse>
                  {ancestry ? (
                    <>
                      <ListItemButton
                        onClick={() => setHierarchyExpand(!hierarchyExpand)}
                      >
                        <ListItemText
                          primary={"Ancestry"}
                          primaryTypographyProps={{
                            fontWeight: "bold",
                          }}
                        />
                        {hierarchyExpand ? <ExpandLess /> : <ExpandMore />}
                      </ListItemButton>
                      <Collapse
                        in={hierarchyExpand}
                        timeout="auto"
                        unmountOnExit
                      >
                        <Ancestry ancestry={ancestry} mesh={mesh} />
                      </Collapse>
                    </>
                  ) : null}
                  <ListItemButton
                    onClick={() => setMetadataExpand(!metadataExpand)}
                  >
                    <ListItemText
                      primary={"Metadata"}
                      primaryTypographyProps={{
                        fontWeight: "bold",
                      }}
                    />
                    {metadataExpand ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={metadataExpand} timeout="auto" unmountOnExit>
                    <Metadata mesh={mesh} />
                  </Collapse>
                </List>
              </CardContent>
            </Card>
          </>
        ) : null}
        <br />
        <br />
        {graph && selected ? (
          <>
            <Edges graph={graph} />
          </>
        ) : null}
        <br />
        {!dialog && start ? (
          <Fab
            color="secondary"
            variant="extended"
            sx={{
              position: "fixed",
              bottom: "3.5rem",
              left: "3.5rem",
            }}
            onClick={() => setDialog(true)}
          >
            <AddIcon className={classes.icon} />
            Update Graph Query
          </Fab>
        ) : null}
        {dialog ? <MetatypeDialog open={dialog} setOpen={setDialog} /> : null}
      </Container>
    </>
  );
}
