"use client";

// Hooks
import { SyntheticEvent, useEffect, useState } from "react";

// Types
import { NodeT, FileT, MetatypeKeyT, MetatypeT } from "@/lib/types";
import { SelectChangeEvent, Typography } from "@mui/material";

// MUI
import { Autocomplete, Grid, TextField } from "@mui/material";

// Store
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";

// Types
import { DataSourceT } from "@/lib/types";

// Components
import DataSourceSelector from "../dataSources/selectDataSource";

const CreateNode = () => {
  // Hooks
  let [options, setOptions] = useState<Array<string> | null>();
  const dataSource = useAppSelector((state) => state.container.dataSource);
  const metatypes = useAppSelector((state) => state.ontology.metatypes);

  useEffect(() => {
    if (metatypes) {
      // You need to [...destructure] metatypes because React contexts are readonly. Pick just the metatype names.
      let options = [...metatypes].map((metatype: MetatypeT) => {
        return metatype.name;
      });
      setOptions(options);
    }
  }, [metatypes]);

  // Handlers
  const handleClass = (event: any, value: string) => {};

  return (
    <>
      <Grid>
        <DataSourceSelector />
        <br />
        <br />
        {dataSource && options ? (
          <Autocomplete
            disablePortal
            id="combo-box-demo"
            options={options.sort()} // Sort the options alphabetically
            groupBy={(option) => option[0]} // Group the options by their first character
            renderInput={(params) => <TextField {...params} label="Class" />}
            onChange={(event, value) => handleClass(event, value!)}
          />
        ) : null}
      </Grid>
    </>
  );
};

export default CreateNode;
