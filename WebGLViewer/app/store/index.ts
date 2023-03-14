import { createSlice, configureStore } from '@reduxjs/toolkit';
import { webGLReducer } from './slices/webGLSlice';

const initialState = {
  openDrawerLeft: true,
  openDrawerLeftWidth: 430,
  openDrawerRight: false,
  openDrawerRightWidth: 425,
  selectedAssetObject: {},
  selectAssetOnScene: '',
  highlightAssetOnScene: '',
  dataViewObject: {},
  tempData: [
    {
      id: 0,
      title: '1-1',
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
      id: 1,
      title: '2-1',
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
      id: 2,
      title: '2-2',
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
      id: 3,
      title: '3-1-1',
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
      id: 4,
      title: '3-1-2',
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
      id: 5,
      title: '3-1-3',
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
      id: 6,
      title: '3-2',
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
      id: 7,
      title: '4-1',
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
      id: 8,
      title: '7-1',
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
      id: 9,
      title: '7-2',
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
      id: 10,
      title: 'AE-1',
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
      id: 11,
      title: 'AE-2',
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
    }
  ]
};

const appStateSlice = createSlice({
  name: 'appState',
  initialState,
  reducers: {
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