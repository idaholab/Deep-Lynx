"use client";

// Hooks
import { useNodes } from "../hooks/useNodes";

// MUI
import {
  Box,
  FormControl,
  LinearProgress,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";

// Store
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";

// Types
import { NodeT, DataSourceT } from "@/lib/types/deeplynx";
import { useEffect, useState } from "react";
type PropsT = {
  dataSource: DataSourceT;
  node: NodeT | undefined;
  setNode: Function;
};

const NodeSelector = (props: PropsT) => {
  const nodes = useNodes(props.dataSource);
  const node = props.node;
  const setNode = props.setNode;

  // Handlers
  const handleNode = (event: SelectChangeEvent) => {
    let node: NodeT = nodes!.find(
      (node: NodeT) => node.id === event.target.value
    )!;
    setNode(node);
  };

  return (
    <>
      <Typography variant="subtitle2">Select a Node</Typography>
      {nodes ? (
        <FormControl sx={{ width: "100%" }}>
          <Select
            labelId="Data Source Select"
            id="_wireframe/components/datasources.tsx"
            value={node ? node.id : ""}
            onChange={handleNode}
          >
            {nodes.map((node: NodeT) => {
              return (
                <MenuItem key={node.id} value={node.id}>
                  <Typography variant="caption" sx={{ color: "grey" }}>
                    ID: {node.id}
                  </Typography>
                  <Box flexGrow={1} />
                  <Typography variant="subtitle1">
                    {JSON.stringify(node.properties)}
                  </Typography>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      ) : (
        <Box sx={{ width: "100%" }}>
          <LinearProgress />
        </Box>
      )}
    </>
  );
};

export default NodeSelector;
