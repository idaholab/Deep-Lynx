"use client";

// Hooks
import { useEffect, useState } from "react";

// MUI
import {
  Button,
  Collapse,
  Card,
  CardContent,
  Container,
  Divider,
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

// Components
import MetatypeDialog from "./components/dialog";
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

  return (
    <>
      <Container>
        {selected && mesh ? (
          <>
            <Typography variant="h5">Object Metadata</Typography>
            <Divider />
            <br />
            <Card>
              <CardContent>
                <List component="div" disablePadding>
                  <ListItemButton onClick={() => setMeshExpand(!meshExpand)}>
                    <ListItemText
                      primary={mesh.Assembly.Name}
                      primaryTypographyProps={{
                        fontWeight: "bold",
                      }}
                    />
                    {meshExpand ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={meshExpand} timeout="auto" unmountOnExit>
                    {Object.entries(mesh.Assembly).map((entry) => {
                      let [key, value]: [string, string] = entry;
                      if (key === "Metadata") return;
                      return (
                        <ListItemText
                          inset
                          key={key}
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
                      );
                    })}
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
        {dialog ? <MetatypeDialog open={dialog} setOpen={setDialog} /> : null}
        <Button onClick={() => setDialog(true)} className={classes.button}>
          Metatypes
        </Button>
        <br />
        <br />
        {graph ? (
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
      </Container>
    </>
  );
}
