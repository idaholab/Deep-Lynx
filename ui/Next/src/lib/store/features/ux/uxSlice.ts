// Redux
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Store
import type { RootState } from "@/lib/store/store";

// Define a type for the slice state
interface uxStateI {
  drawer: boolean;
}

// Define the initial state using that type
const initialState: uxStateI = {
  drawer: true,
};

export const uxSlice = createSlice({
  name: "ux",
  initialState, // `createSlice` will infer the state type from the `initialState` argument
  reducers: {
    // Use the PayloadAction type to declare the contents of `action.payload`
    drawer: (state, action: PayloadAction<boolean>) => {
      state.drawer = action.payload;
    },
  },
});

/**
 * Import the ACTIONS into your component to change the state held by this slice
 * Import the SELECTORS into your component to read the state held by this slice
 */
export const uxActions = uxSlice.actions;
export const uxSelector = (state: RootState) => state.ux;

export const uxReducer = uxSlice.reducer;
