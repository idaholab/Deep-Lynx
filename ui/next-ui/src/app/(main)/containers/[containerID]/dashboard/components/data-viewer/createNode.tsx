"use client";

// Hooks
import { SyntheticEvent, useEffect, useState } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";
import { useDatasources } from "@/lib/context/DataSourceProvider";

// Types
import { NodeT, FileT } from "@/lib/types";
import { SelectChangeEvent } from "@mui/material";

// MUI
import { Grid, TextField } from "@mui/material";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";

// Store
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";

// Types
import { DataSourceT } from "@/lib/types";

type DataSourceOptionT = DataSourceT & {
  firstLetter: string;
};

// Functions
const filter = createFilterOptions<DataSourceOptionT>();

const CreateNode = () => {
  // Hooks
  const container = useContainer();

  return (
    <>
      <Grid></Grid>
    </>
  );
};

export default CreateNode;
