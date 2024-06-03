// Redux
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Store
import type { RootState } from "@/lib/store/store";

// Define a type for the slice state
interface ThemeStateI {
    theme: string;
}

// Define the initial state using that type
const initialState: ThemeStateI = {
    theme: "light",
};

export const themeSlice = createSlice({
    name: "theme",
    initialState, // `createSlice` will infer the state type from the `initialState` argument
    reducers: {
        // Use the PayloadAction type to declare the contents of `action.payload`
        setTheme: (state, action: PayloadAction<string>) => {
            state.theme = action.payload;
        },
    },
});

/**
 * Import the ACTIONS into your component to change the state held by this slice
 * Import the SELECTORS into your component to read the state held by this slice
 */
export const themeActions = themeSlice.actions;
export const themeSelector = (state: RootState) => state.theme;

export const themeReducer = themeSlice.reducer;
