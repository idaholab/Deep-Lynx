"use client";

// Hooks
import { useCallback, useEffect, useState } from "react";
import { useUnityContext } from "react-unity-webgl";

// Components
import { renderRow } from "./helpers/virtualList";
import { FixedSizeList } from "react-window";

// MUI
import {
  Collapse,
  Container,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs,
} from "@mui/material";

// Icons
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ScatterPlot from "@mui/icons-material/ScatterPlot";

// Types
import { MetatypeRelationshipPairT } from "@/lib/types";
type RelatedNode = {
  MetatypeName: string;
  OwnerId: string;
  [key: string]: string;
};
type Props = {
  mesh: Array<MetatypeRelationshipPairT> | undefined;
  data: Array<RelatedNode> | undefined;
};

function Panel(props: Props) {
  // Hooks
  const [expand, setExpand] = useState<number | undefined>(undefined);
  const [tab, setTab] = useState<string>("Mesh");

  // Handlers
  const handleExpand = (index: number) => {
    if (index === expand) {
      setExpand(undefined);
      return;
    }
    setExpand(index);
  };
  const handleTab = (event: React.SyntheticEvent, tab: string) => {
    setTab(tab);
  };

  return (
    <>
      <Container>
        <Tabs value={tab} onChange={handleTab}>
          <Tab label={"Mesh"} value={"Mesh"} />
          <Tab label={"Relationships"} value={"Relationships"} />
        </Tabs>
        {tab === "Mesh" ? (
          props.mesh ? (
            <FixedSizeList
              itemSize={50}
              itemCount={props.mesh.length}
              width={"100%"}
              height={"100%"}
              itemData={props.mesh}
            >
              {renderRow}
            </FixedSizeList>
          ) : null
        ) : null}
        {tab === "Relationships"
          ? props.data
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
                    <Collapse
                      in={index === expand}
                      timeout="auto"
                      unmountOnExit
                    >
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
            : null
          : null}
      </Container>
    </>
  );
}

export default Panel;
