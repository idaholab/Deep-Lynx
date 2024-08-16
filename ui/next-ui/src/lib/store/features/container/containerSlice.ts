// Redux
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Store
import type { RootState } from "@/lib/store/store";

// Types
import { ContainerT, DataSourceT } from "@/lib/types";

// Define a type for the slice state
interface ContainerStateI {
  container: ContainerT | null;
  dataSources: Array<DataSourceT> | null;
}

// Define the initial state using that type
const initialState: ContainerStateI = {
  container: null,
  dataSources: null,
};

export const containerSlice = createSlice({
  name: "container",
  initialState, // `createSlice` will infer the state type from the `initialState` argument
  reducers: {
    // Use the PayloadAction type to declare the contents of `action.payload`
    setContainer: (state, action: PayloadAction<ContainerT>) => {
      state.container = action.payload;
    },
    setDataSources: (state, action: PayloadAction<Array<DataSourceT>>) => {
      state.dataSources = action.payload;
    },
  },
});

/**
 * Import the ACTIONS into your component to change the state held by this slice
 * Import the SELECTORS into your component to read the state held by this slice
 */
export const containerActions = containerSlice.actions;
export const containerSelector = (state: RootState) => state.container;

export const containerReducer = containerSlice.reducer;
