import { createSlice, configureStore } from '@reduxjs/toolkit';

const initialState = {};

const appStateSlice = createSlice({
  name: 'appState',
  initialState,
  reducers: {},
});


export const store = configureStore({
  reducer: {
    appState: appStateSlice.reducer,
  },
});

export const appStateActions = appStateSlice.actions;

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
