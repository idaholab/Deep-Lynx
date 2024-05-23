// Redux
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Store
import type { RootState } from "@/lib/store/store";

// Types
import { ContainerT } from "@/lib/types";

// Define a type for the slice state
interface ContainerState {
    container: ContainerT | null;
}

// Define the initial state using that type
const initialState: ContainerState = {
    container: null,
};

export const containerSlice = createSlice({
    name: "container",
    initialState, // `createSlice` will infer the state type from the `initialState` argument
    reducers: {
        // Use the PayloadAction type to declare the contents of `action.payload`
        setContainer: (state, action: PayloadAction<ContainerT>) => {
            state.container = action.payload;
        },
    },
});

/**
 * Import the ACTIONS into your component to change the state held by this slice
 * Import the SELECTORS into your component to read the state held by this slice
 */
export const containerActions = containerSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectSelectors = (state: RootState) => state.container;

export const containerReducer = containerSlice.reducer;
