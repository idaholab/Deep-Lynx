import { createSlice, configureStore } from '@reduxjs/toolkit';
import { webGLReducer } from './slices/webGLSlice';

const initialState = {
  openDrawerLeft: true,
  openDrawerRight: false,
  selectedAssetObject: {},
  selectAssetOnScene: '',
  highlightAssetOnScene: '',
  dataViewObject: {},
};

const appStateSlice = createSlice({
  name: 'appState',
  initialState,
  reducers: {
    toggleDrawerLeft: (state) => {
      const store = state;
      store.openDrawerLeft = !store.openDrawerLeft;
    },
    toggleDrawerRight: (state) => {
      const store = state;
      store.openDrawerRight = !store.openDrawerRight;
    },
    selectAssetObject: (state, action) => {
      const store = state;
      store.selectedAssetObject = action.payload;
    },
    selectAssetOnScene: (state, action) => {
      const store = state;
      store.selectAssetOnScene = action.payload;
    },
    highlightAssetOnScene: (state, action) => {
      const store = state;
      store.highlightAssetOnScene = action.payload;
    },
    setDataViewObject: (state, action) => {
      const store = state;
      store.dataViewObject = action.payload;
    },
  },
});

export const store = configureStore({
  reducer: {
    appState: appStateSlice.reducer,
    webGL: webGLReducer
  },
});

export const appStateActions = appStateSlice.actions;

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch


export * from './thunks/fetchWebGL';