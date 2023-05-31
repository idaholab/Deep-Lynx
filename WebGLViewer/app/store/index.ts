import { createSlice, configureStore } from '@reduxjs/toolkit';
import { webGLReducer } from './slices/webGLSlice';

const initialState = {
  // Refactor Begin
  query: false,
  host: '',
  container: '',
  token: '',
  metadata: '',
  tagRefactor: '',
  tagId: null,
  // Refactor End
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
  containerId: null,
  sceneList: [],
  unityNodes: [],
  deepLynxNodes: [],
  tag: [],
};

const appStateSlice = createSlice({
  name: 'appState',
  initialState,
  reducers: {
    // Refactor Reducers Begin
    setQuery: (state, action) => {
      const store = state;
      store.query = action.payload;
    },
    setHost: (state, action) => {
      const store = state;
      store.host = action.payload;
    },
    setContainer: (state, action) => {
      const store = state;
      store.container = action.payload;
    },
    setToken: (state, action) => {
      const store = state;
      store.token = action.payload;
    },
    setMetadata: (state, action) => {
      const store = state;
      store.metadata = action.payload;
    },
    setTagRefactor: (state, action) => {
      const store = state;
      store.tagRefactor = action.payload;
    },
    setTagId: (state, action) => {
      const store = state;
      store.tagId = action.payload;
    },
    // Refactor Reducers End
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
      console.log(action.payload);
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
    setSceneList: (state, action) => {
      const store = state;
      store.sceneList = action.payload;
    },

    // WebGL File Set Functions
    setWebGLFileSetId: (state, action) => {
      const store = state;
      store.selectedWebGLFileSetId = action.payload;
    },
    setTag: (state, action) => {
      const store = state;
      store.tag = action.payload;
    },

    // DeepLynx data
    setContainerId: (state, action) => {
      const store = state;
      store.containerId = action.payload;
    },
    setDeepLynxNodes: (state, action) => {
      const store = state;
      store.deepLynxNodes = action.payload;
    },

    // Unity Data
    setUnityNodes: (state, action) => {
      const store = state;
      store.unityNodes = action.payload;
    },
  },
});

export const store = configureStore({
  reducer: {
    appState: appStateSlice.reducer,
    webGL: webGLReducer,
  },
});

export const appStateActions = appStateSlice.actions;

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
