"use client";

// Hooks
import { useState } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";
import { useDatasources } from "@/lib/context/DataSourceProvider";

// MUI
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";

// Store
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { containerActions } from "@/lib/store/features/container/containerSlice";

// Types
import { DataSourceT } from "@/lib/types";

type DataSourceOptionT = DataSourceT & {
  firstLetter: string;
};

const DataSourceSelector = () => {
  // Hooks
  const dataSource: DataSourceT | null = useAppSelector(
    (state) => state.container.dataSource
  );
  const dataSources: Array<DataSourceT> = useAppSelector(
    (state) => state.container.dataSources!
  );

  const storeDispatch = useAppDispatch();

  // Handlers
  const handleDataSource = (event: SelectChangeEvent) => {
    const selectedDataSource = dataSources.find((datasource) => {
      datasource.id === event.target.value;
    })!;

    storeDispatch(containerActions.setDataSource(selectedDataSource));
  };

  return (
    <>
      <FormControl sx={{ width: "15%" }}>
        <Select
          labelId="DataSource Select"
          id="_wireframe/components/datasources.tsx"
          value={dataSource?.id}
          onChange={handleDataSource}
          size="small"
        >
          {dataSources.map((ds: DataSourceT) => {
            return (
              <MenuItem
                key={ds.id}
                value={ds.id}
                sx={{ display: "flex", flexDirection: "row" }}
              >
                <Typography variant="caption" sx={{ color: "grey" }}>
                  ID: {ds.id}
                </Typography>
                <Box flexGrow={1} />
                <Typography variant="caption" sx={{ color: "grey" }}>
                  {ds.name}
                </Typography>
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    </>
  );
};

export default DataSourceSelector;
