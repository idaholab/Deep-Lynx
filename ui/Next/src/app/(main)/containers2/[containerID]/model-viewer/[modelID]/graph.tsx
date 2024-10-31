"use client";

// Hooks
import { useEffect, useState } from "react";

// MUI
import {
  Box,
  Button,
  Collapse,
  Card,
  CardContent,
  Container,
  Divider,
  Fab,
  Grid,
  List,
  ListItem,
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
import Ancestry from "./components/ancestry";

// Styles
import { classes } from "@/app/styles";

// Types
import { MeshObject, RelatedNodeT } from "@/lib/types/modules/modelViewer";

type Props = {
  graph: Array<RelatedNodeT> | undefined;
  mesh: MeshObject | undefined;
  selected: boolean;
};

export default function Graph(props: Props) {
  // Hooks
  const [nodeExpand, setNodeExpand] = useState<number | undefined>(undefined);
  const [meshExpand, setMeshExpand] = useState<boolean>(true);
  const [hierarchyExpand, setHierarchyExpand] = useState<boolean>(false);
  const [metadataExpand, setMetadataExpand] = useState<boolean>(false);
  const [dialog, setDialog] = useState<boolean>(false);

  const graph: Array<RelatedNodeT> | undefined = props.graph;
  const mesh: MeshObject | undefined = props.mesh;
  const ancestry = mesh ? [...mesh.AssemblyParents].reverse() : undefined;
  const selected: boolean = props.selected;

  // Handlers
  const handleExpand = (index: number) => {
    if (index === nodeExpand) {
      setNodeExpand(undefined);
      return;
    }
    setNodeExpand(index);
  };

  useEffect(() => {
    console.log(graph);
  }, [graph]);

  return (
    <>
      <Container>
        {selected && mesh ? (
          <>
            <Card>
              <CardContent>
                <List component="div" disablePadding>
                  <ListItemButton onClick={() => setMeshExpand(!meshExpand)}>
                    <ListItemText
                      primary={mesh.Assembly.Name}
                      primaryTypographyProps={{
                        variant: "h4",
                        fontWeight: "bold",
                      }}
                    />
                    {meshExpand ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={meshExpand} timeout="auto" unmountOnExit>
                    <br />
                    {Object.entries(mesh.Assembly).map((entry) => {
                      let [key, value]: [string, string] = entry;
                      if (key === "Metadata") return;
                      return (
                        <>
                          <Box sx={{ paddingLeft: "2.5rem" }}>
                            <ListItem key={key}>
                              <Grid container spacing={2}>
                                <Grid item xs={4}>
                                  <Typography
                                    variant="caption"
                                    fontWeight={"bold"}
                                  >
                                    {key.toLowerCase()}
                                  </Typography>
                                </Grid>
                                <Grid item xs={8}>
                                  <Typography variant="caption">
                                    {value as string}
                                  </Typography>
                                </Grid>
                              </Grid>
                            </ListItem>
                            <Divider key={key} />
                          </Box>
                        </>
                      );
                    })}
                    <br />
                    {ancestry ? (
                      <>
                        <ListItemButton
                          onClick={() => setHierarchyExpand(!hierarchyExpand)}
                        >
                          <ListItemText
                            primary={"Hierarchy"}
                            primaryTypographyProps={{
                              fontWeight: "bold",
                            }}
                          />
                          {hierarchyExpand ? <ExpandLess /> : <ExpandMore />}
                        </ListItemButton>
                        <br />
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
                      <List>
                        {Object.entries(mesh.Assembly.Metadata).map((entry) => {
                          let [key, value] = entry;
                          return (
                            <>
                              <Box sx={{ paddingLeft: "2.5rem" }}>
                                <ListItem key={key}>
                                  <Grid container spacing={2}>
                                    <Grid item xs={4}>
                                      <Typography
                                        variant="caption"
                                        fontWeight={"bold"}
                                        sx={{ wordWrap: "break-word" }}
                                      >
                                        {key.toLowerCase()}
                                      </Typography>
                                    </Grid>
                                    <Grid
                                      item
                                      xs={8}
                                      sx={{
                                        display: "flex",
                                        justifyContent: "end",
                                      }}
                                    >
                                      <Typography variant="caption">
                                        {(value as string).replace(
                                          /['"]+/g,
                                          ""
                                        )}
                                      </Typography>
                                    </Grid>
                                  </Grid>
                                </ListItem>
                                <Divider key={key} />
                              </Box>
                            </>
                          );
                        })}
                      </List>
                    </Collapse>
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
            <Typography variant="h5">Related Nodes</Typography>
            <Divider />
            {graph.map((node: RelatedNodeT, index: number) => {
              return (
                <List key={index}>
                  <ListItemButton onClick={() => handleExpand(index)}>
                    <ListItemText primary={node.MetatypeName} />
                    {index === nodeExpand ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse
                    in={index === nodeExpand}
                    timeout="auto"
                    unmountOnExit
                  >
                    <List component="div" disablePadding>
                      {Object.entries(node).map((entry) => {
                        let [key, value] = entry;
                        return (
                          <>
                            <Box sx={{ paddingLeft: "2.5rem" }}>
                              <ListItemText
                                inset
                                key={index + key}
                                primaryTypographyProps={{
                                  variant: "subtitle2",
                                  fontWeight: "bold",
                                }}
                                primary={key.toUpperCase()}
                                secondary={value}
                                secondaryTypographyProps={{
                                  variant: "caption",
                                }}
                              />
                            </Box>
                          </>
                        );
                      })}
                    </List>
                  </Collapse>
                </List>
              );
            })}
          </>
        ) : null}
        <br />
        {!dialog ? (
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
