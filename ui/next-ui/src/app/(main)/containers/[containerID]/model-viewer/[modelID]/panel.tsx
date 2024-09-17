"use client";

// Hooks
import { useState } from "react";

// MUI
import {
  Collapse,
  Card,
  CardHeader,
  CardContent,
  Container,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";

// Icons
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

// Components
import SelectMetatype from "./components/selectMetatype";

// Types
import { MeshObject } from "./page";
type RelatedNode = {
  MetatypeName: string;
  OwnerId: string;
  [key: string]: string;
};
type Props = {
  data: Array<RelatedNode> | undefined;
  mesh: MeshObject | undefined;
};

function Panel(props: Props) {
  // Hooks
  const [expand, setExpand] = useState<number | undefined>(undefined);

  const data: Array<RelatedNode> | undefined = props.data;
  const mesh: MeshObject | undefined = props.mesh;

  // Handlers
  const handleExpand = (index: number) => {
    if (index === expand) {
      setExpand(undefined);
      return;
    }
    setExpand(index);
  };

  return (
    <>
      <Container>
        <SelectMetatype />
        <br />
        <br />
        {data ? (
          <>
            <Typography variant="h5">Related Nodes</Typography>
            <Divider />
            {data.map((node: RelatedNode, index: number) => {
              return (
                <List key={index}>
                  <ListItemButton onClick={() => handleExpand(index)}>
                    <ListItemText primary={node.MetatypeName} />
                    {index === expand ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={index === expand} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {Object.entries(node).map((entry) => {
                        let [key, value] = entry;
                        return (
                          <ListItemText
                            inset
                            key={key}
                            primaryTypographyProps={{
                              variant: "subtitle2",
                            }}
                            primary={key.toUpperCase()}
                            secondary={value}
                            secondaryTypographyProps={{
                              variant: "caption",
                              color: "black",
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
        <br />
        {mesh ? (
          <>
            <Typography variant="h5">Object Metadata</Typography>
            <Divider />
            <br />
            <Card>
              <CardHeader>
                <Typography variant="subtitle2">{mesh.Part.Name}</Typography>
              </CardHeader>
              <br />
              <CardContent>
                <List component="div" disablePadding>
                  {Object.entries(mesh.Assembly.Metadata).map((entry) => {
                    let [key, value] = entry;
                    return (
                      <ListItemText
                        inset
                        key={key}
                        primaryTypographyProps={{
                          variant: "subtitle2",
                        }}
                        primary={key.toUpperCase()}
                        secondary={value as string}
                        secondaryTypographyProps={{
                          variant: "caption",
                          color: "black",
                        }}
                      />
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </>
        ) : null}
      </Container>
    </>
  );
}

export default Panel;
