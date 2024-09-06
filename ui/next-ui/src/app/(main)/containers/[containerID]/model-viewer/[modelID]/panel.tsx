"use client";

// Hooks
import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "@/lib/store/hooks";

// MUI
import {
  Collapse,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Select,
  Typography,
} from "@mui/material";

// Icons
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ScatterPlot from "@mui/icons-material/ScatterPlot";

// Components
import SelectMetatype from "./components/selectMetatype";

// Types
import { MetatypeT } from "@/lib/types";
type RelatedNode = {
  MetatypeName: string;
  OwnerId: string;
  [key: string]: string;
};
type Props = {
  data: Array<RelatedNode> | undefined;
};

function Panel(props: Props) {
  // Hooks
  const [expand, setExpand] = useState<number | undefined>(undefined);

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
        {props.data ? (
          <>
            <Typography variant="subtitle1">Related Nodes</Typography>
            {props.data.map((node: RelatedNode, index: number) => {
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
                              variant: "body1",
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
      </Container>
    </>
  );
}

export default Panel;
