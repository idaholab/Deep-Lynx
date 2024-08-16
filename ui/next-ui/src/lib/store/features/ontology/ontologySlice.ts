// Redux
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Store
import type { RootState } from "@/lib/store/store";

// Types
import { MetatypeT } from "@/lib/types";

// Define a type for the slice state
interface OntologyStateI {
  metatypes: Array<MetatypeT> | null;
}

// Define the initial state using that type
const initialState: OntologyStateI = {
  metatypes: null,
};

export const ontologySlice = createSlice({
  name: "ontology",
  initialState, // `createSlice` will infer the state type from the `initialState` argument
  reducers: {
    // Use the PayloadAction type to declare the contents of `action.payload`
    setMetatypes: (state, action: PayloadAction<Array<MetatypeT>>) => {
      state.metatypes = action.payload;
    },
  },
});

/**
 * Import the ACTIONS into your component to change the state held by this slice
 * Import the SELECTORS into your component to read the state held by this slice
 */
export const ontologyActions = ontologySlice.actions;

export const ontologySelector = (state: RootState) => state.ontology;
export const ontologyReducer = ontologySlice.reducer;
