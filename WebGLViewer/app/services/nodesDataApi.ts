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
    getAllNodes: builder.query({
      query: ({ host, container, tagId }) => ({
        url: `${host}/containers/${container}/graphs/tags/${tagId}/nodes`,
      })
    }),
    getNodeHistory: builder.query({
      query: ({ host, container, nodeId }) => ({
        url: `${host}/containers/${container}/graphs/nodes/${nodeId}/`,
        params: { history: 'true' },
      })
    }),
    getNodeFiles: builder.query({
      query: ({ host, container, nodeId }) => ({
        url: `${host}/containers/${container}/graphs/nodes/${nodeId}/files`,
      })
    }),
    getNodeLinkedInformation: builder.query({
      query: ({ host, container, nodeId }) => ({
        url: `${host}/containers/${container}/graphs/nodes/${nodeId}/graph?depth=1`,
      })
    }),
    getNodeTags: builder.query({
      query: ({ host, container, nodeId }) => ({
        url: `${host}/containers/${container}/graphs/tags/nodes/${nodeId}`,
      })
    }),
  }),
});

export const {
  useGetAllNodesQuery,
  useGetNodeHistoryQuery,
  useGetNodeFilesQuery,
  useGetNodeLinkedInformationQuery,
  useGetNodeTagsQuery
} = nodesDataApi;