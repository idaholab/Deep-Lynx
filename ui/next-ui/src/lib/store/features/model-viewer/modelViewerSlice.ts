// Redux
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Store
import type { RootState } from "@/lib/store/store";

// Types
import { FileT } from "@/lib/types";

// Define a type for the slice state
interface ModelViewerStateI {
  file: FileT | null;
}

// Define the initial state using that type
const initialState: ModelViewerStateI = {
  file: null,
};

export const modelViewerSlice = createSlice({
  name: "modelViewer",
  initialState, // `createSlice` will infer the state type from the `initialState` argument
  reducers: {
    // Use the PayloadAction type to declare the contents of `action.payload`
    setFile: (state, action: PayloadAction<FileT>) => {
      state.file = action.payload;
    },
  },
});

/**
 * Import the ACTIONS into your component to change the state held by this slice
 * Import the SELECTORS into your component to read the state held by this slice
 */
export const modelViewerActions = modelViewerSlice.actions;
export const modelViewerSelector = (state: RootState) => state.modelViewer;
export const modelViewerReducer = modelViewerSlice.reducer;
