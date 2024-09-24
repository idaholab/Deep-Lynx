"use client";

// MUI
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";

// Store
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { containerActions } from "@/lib/store/features/container/containerSlice";

// Types
import { DataSourceT } from "@/lib/types/deeplynx";

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
    const selectedDataSource = dataSources.find(
      (ds) => ds.id == event.target.value
    )!;

    storeDispatch(containerActions.setDataSource(selectedDataSource));
  };

  return (
    <>
      <Typography variant="subtitle2">Select a DataSource</Typography>
      <FormControl sx={{ width: "100%" }}>
        <Select
          labelId="Data Source Select"
          id="_wireframe/components/datasources.tsx"
          value={dataSource ? dataSource.id : ""}
          onChange={handleDataSource}
        >
          {dataSources
            ? dataSources.map((ds: DataSourceT) => {
                return (
                  <MenuItem key={ds.id} value={ds.id}>
                    <Typography variant="caption" sx={{ color: "grey" }}>
                      ID: {ds.id}
                    </Typography>
                    <Box flexGrow={1} />
                    <Typography variant="subtitle1">{ds.name}</Typography>
                  </MenuItem>
                );
              })
            : null}
        </Select>
      </FormControl>
    </>
  );
};

export default DataSourceSelector;
