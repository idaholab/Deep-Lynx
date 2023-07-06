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
  tagTypes: ['Session'],
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
  }),
});

export const {
  useGetAllSessionsQuery,
  useAddSessionMutation,
  useDeleteSessionMutation,
} = sessionsDataApi;