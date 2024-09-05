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
        {props.data
          ? props.data.map((node: RelatedNode, index: number) => {
              return (
                <List key={index}>
                  <ListItemButton onClick={() => handleExpand(index)}>
                    <ListItemIcon>
                      <ScatterPlot />
                    </ListItemIcon>
                    <ListItemText primary={node.MetatypeName} />
                    {expand ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={index === expand} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      <ListItemText
                        primary={"Class"}
                        secondary={node.MetatypeName}
                      />
                      <ListItemText
                        primary={"Owner"}
                        secondary={node.OwnerId}
                      />
                    </List>
                  </Collapse>
                </List>
              );
            })
          : null}
      </Container>
    </>
  );
}

export default Panel;
