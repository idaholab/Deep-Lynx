import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

export const nodesDataApi = createApi({
  reducerPath: 'nodesData',
  baseQuery: fetchBaseQuery({
    prepareHeaders: (headers, { getState }) => {
      const state: RootState = getState() as RootState;
      const { token } = state.appState;
      if (token) {
        headers.set('Authorization', `bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getNodes: builder.query({
      query: ({ host, container, tagId }) =>
        `${host}/containers/${container}/graphs/tags/${tagId}/nodes`,
    }),
    getSingleNodeHistory: builder.query({
      query: ({ host, container, nodeId }) => ({
        url: `${host}/containers/${container}/graphs/nodes/${nodeId}/`,
        params: { history: 'true' },
      })
    }),
  }),
});

export const { useGetNodesQuery, useGetSingleNodeHistoryQuery } = nodesDataApi;