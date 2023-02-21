import { createSlice } from '@reduxjs/toolkit';
import { fetchWebGL } from '../thunks/fetchWebGL';

const webGLSlice = createSlice({
  name: 'webGL',
  initialState: {
    isLoading: false,
    data: [],
    error: null,
  },
  extraReducers(builder) {
    builder.addCase(fetchWebGL.pending, (state, action) => {
      state.isLoading = true;
    });
    builder.addCase(fetchWebGL.fulfilled, (state, action) => {
      state.isLoading = false;
      state.data = action.payload;
    });
    builder.addCase(fetchWebGL.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error;
    });
  },
});

export const webGLReducer = webGLSlice.reducer;
