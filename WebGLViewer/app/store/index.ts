import { createSlice, configureStore } from '@reduxjs/toolkit';
import { webGLReducer } from './slices/webGLSlice';

const initialState = {
  openDrawerLeft: false,
  openDrawerLeftWidth: 64,
  openDrawerRight: false,
  openDrawerRightWidth: 425,
  selectedAssetObject: {},
  selectedSceneObject: {},
  selectedWebGLFileSetId: null,
  selectAssetOnScene: '',
  highlightAssetOnScene: '',
  dataViewObject: {},
  containerId: 2,
  tempSceneData: [
    'Scene 1',
    'Scene 2',
    'Scene 3',
    'Scene 4',
    'Scene 5'
  ]
};

const appStateSlice = createSlice({
  name: 'appState',
  initialState,
  reducers: {
    // App functions
    toggleDrawerLeft: (state) => {
      const store = state;
      store.openDrawerLeft = !store.openDrawerLeft;
    },
    setDrawerLeftWidth: (state, action) => {
      const store = state;
      store.openDrawerLeftWidth = action.payload;
    },
    toggleDrawerRight: (state) => {
      const store = state;
      store.openDrawerRight = !store.openDrawerRight;
    },

    // Asset functions
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

    // Scene functions
    selectSceneObject: (state, action) => {
      const store = state;
      store.selectedSceneObject = action.payload;
    },

    // WebGL File Set Functions
    setWebGLFileSetId: (state, action) => {
      const store = state;
      store.selectedWebGLFileSetId = action.payload;
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