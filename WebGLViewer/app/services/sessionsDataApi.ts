import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

export const sessionsDataApi = createApi({
  reducerPath: 'sessionsDataApi',
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
  tagTypes: ['Session', 'Player', 'Object'],
  endpoints: (build) => ({
    getAllSessions: build.query({
      query: ({ host, container }) => ({
        url: `${host}/containers/${container}/serval/sessions`,
      }),
      providesTags: ['Session']
    }),
    deleteSession: build.mutation({
      query: ({ host, container, sessionId }) => ({
        url: `${host}/containers/${container}/serval/sessions/${sessionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Session']
    }),
    addSession: build.mutation({
      query: ({ host, container, sessionData }) => ({
        url: `${host}/containers/${container}/serval/sessions`,
        method: 'POST',
        body: sessionData,
      }),
      invalidatesTags: ['Session']
    }),
    getAllPlayers: build.query({
      query: ({ host, container, sessionId }) => ({
        url: `${host}/containers/${container}/serval/sessions/${sessionId}/players/`,
      }),
      providesTags: ['Player']
    }),
    deletePlayer:build.mutation({
      query: ({ host, container, sessionId, playerId }) => ({
        url: `${host}/containers/${container}/serval/sessions/${sessionId}/players/${playerId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Player']
    }),
    getAllObjects: build.query({
      query: ({ host, container, sessionId }) => ({
        url: `${host}/containers/${container}/serval/sessions/${sessionId}/objects/`,
      }),
      providesTags: ['Object']
    }),
    deleteObject:build.mutation({
      query: ({ host, container, sessionId, objectId }) => ({
        url: `${host}/containers/${container}/serval/sessions/${sessionId}/objects/${objectId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Object']
    })
  }),
});

export const {
  useGetAllSessionsQuery,
  useAddSessionMutation,
  useDeleteSessionMutation,
  useGetAllPlayersQuery,
  useDeletePlayerMutation,
  useGetAllObjectsQuery,
  useDeleteObjectMutation
} = sessionsDataApi;