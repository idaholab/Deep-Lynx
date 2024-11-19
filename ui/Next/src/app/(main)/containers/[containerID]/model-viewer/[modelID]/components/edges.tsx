import { useState } from "react";

import {
  Box,
  Divider,
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";

import { RelatedNodeT } from "@/lib/types/modules/modelViewer";

// Icons
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

type PropsT = {
  graph: Array<RelatedNodeT>;
};

export default function Edges(props: PropsT) {
  const [nodeExpand, setNodeExpand] = useState<number | undefined>(undefined);

  const graph = props.graph;

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
      <Typography variant="h5">Related Nodes</Typography>
      <Divider />
      {graph.map((node: RelatedNodeT, index: number) => {
        return (
          <List key={`${node.MetatypeName}`}>
            <ListItemButton onClick={() => handleExpand(index)}>
              <ListItemText primary={node.MetatypeName} />
              {index === nodeExpand ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={index === nodeExpand} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {Object.entries(node).map(([key, value]) => {
                  return (
                    <>
                      <Box key={key} sx={{ paddingLeft: "2.5rem" }}>
                        <ListItemText
                          inset
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
  );
}
