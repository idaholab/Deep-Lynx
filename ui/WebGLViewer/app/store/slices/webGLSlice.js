import { createSlice } from '@reduxjs/toolkit';

const webGLSlice = createSlice({
  name: 'webGL',
  initialState: {
    isLoading: false,
    data: [],
    error: null,
  },
});

export const webGLReducer = webGLSlice.reducer;
