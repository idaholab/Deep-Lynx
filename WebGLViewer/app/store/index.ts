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
  tempData: [
    {
      id: 34633,
      title: '1-1',
      details: {
        type: 'Structure',
        datasource: '(2)',
        createdAt: '2023-03-01 14:39:34',
        modifiedAt: '2023-03-01 14:39:34'
      },
      history: [
        {
          time: '2023-03-01 14:39:34',
          details: 'dataQuery.createdBy: Adam Pluth'
        },
        {
          time: '2023-03-01 14:31:22',
          details: 'dataQuery.otherEvent'
        },
        {
          time: '2023-03-01 14:28:17',
          details: 'dataQuery.otherEvent'
        },
        {
          time: '2023-03-01 14:24:08 ',
          details: 'dataQuery.otherEvent'
        },
      ],
      metadata: [
        {
          title: 'General Settings',
          data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
        },
        {
          title: 'Users',
          data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
        },
        {
          title: 'Advanced Settings',
          data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
        },
        {
          title: 'Personal Data',
          data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
        }
      ]
    },
    {
      id: 22345,
      title: '2-1',
      details: {
        type: 'Structure',
        datasource: '(2)',
        createdAt: '2023-03-01 14:39:34',
        modifiedAt: '2023-03-01 14:39:34'
      },
      history: [
        {
          time: '2023-03-01 14:39:34',
          details: 'dataQuery.createdBy: Adam Pluth'
        },
        {
          time: '2023-03-01 14:31:22',
          details: 'dataQuery.otherEvent'
        },
        {
          time: '2023-03-01 14:28:17',
          details: 'dataQuery.otherEvent'
        },
        {
          time: '2023-03-01 14:24:08 ',
          details: 'dataQuery.otherEvent'
        },
      ],
      metadata: [
        {
          title: 'General Settings',
          data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
        },
        {
          title: 'Users',
          data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
        },
        {
          title: 'Advanced Settings',
          data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
        },
      ]
    },
    {
      id: 23425,
      title: '2-2',
      details: {
        type: 'Structure',
        datasource: '(2)',
        createdAt: '2023-03-01 14:39:34',
        modifiedAt: '2023-03-01 14:39:34'
      },
      history: [
        {
          time: '2023-03-01 14:39:34',
          details: 'dataQuery.createdBy: Adam Pluth'
        },
        {
          time: '2023-03-01 14:31:22',
          details: 'dataQuery.otherEvent'
        },
        {
          time: '2023-03-01 14:28:17',
          details: 'dataQuery.otherEvent'
        },
        {
          time: '2023-03-01 14:24:08 ',
          details: 'dataQuery.otherEvent'
        },
      ],
      metadata: [
        {
          title: 'General Settings',
          data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
        },
        {
          title: 'Users',
          data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
        },
        {
          title: 'Advanced Settings',
          data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
        },
        {
          title: 'Personal Data',
          data: 'Nulla facilisi. Phasellus sollicitudin nulla et quam mattis feugiat. Aliquam eget maximus est, id dignissim quam.'
        }
      ]
    },
  ],
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