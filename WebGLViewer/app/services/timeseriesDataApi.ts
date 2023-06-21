import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

export const timeseriesDataApi = createApi({
  reducerPath: 'timeseriesData',
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
    getTimeseriesData: builder.query({
      query: ({ host, container, nodeId }) => ({
        url: `${host}/containers/${container}/graphs/nodes/${nodeId}/timeseries`,
      })
    }),
    getTimeseriesCount: builder.query({
      query: ({ host, container, dataSource }) => ({
        url: `${host}/containers/${container}/import/datasources/${dataSource}/timeseries/count`,
      })
    }),
    getTimeseriesRange: builder.query({
      query: ({ host, container, dataSource }) => ({
        url: `${host}/containers/${container}/import/datasources/${dataSource}/timeseries/range`,
      })
    }),
  }),
});

export const {
  useGetTimeseriesDataQuery,
  useGetTimeseriesCountQuery,
  useGetTimeseriesRangeQuery,
} = timeseriesDataApi;