import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { DateTime } from 'luxon';

export const timeseriesDataApi = createApi({
  reducerPath: 'timeseriesData',
  baseQuery: fetchBaseQuery({
    baseUrl: '',
    prepareHeaders: (headers, { getState }) => {
      const state = getState();
      const { token } = state.appState;
      if (token) {
        headers.set('Authorization', `bearer ${token}`);
      }
      return headers;
    },
  }),

  endpoints: (build) => ({
    getTimeseriesData: build.query({
      queryFn: async ({ host, container, nodeId }, api, _extraOptions, fetchWithBQ) => {
        const fetchDatasources = await fetchWithBQ(
          `${host}/containers/${container}/graphs/nodes/${nodeId}/timeseries`
        );

        if (fetchDatasources.error) {
          throw fetchDatasources.error;
        }

        const dataSources = fetchDatasources.data;

        const isTimestamp = (entry) => {
          if (DateTime.fromISO(entry).isValid === true) {
            return `${DateTime.fromISO(entry).toLocaleString(DateTime.DATE_SHORT)}, ${DateTime.fromISO(entry).toLocaleString(DateTime.TIME_WITH_SHORT_OFFSET)}`;
          } else {
            return entry;
          }
        };

        const result = await Object.entries(dataSources.value).reduce(async (
          acc,
          curr
        ) => {
          const [key, val] = curr;
          const dataSource = val;

          const getTimeseriesCount = await fetchWithBQ(
            `${host}/containers/${container}/import/datasources/${dataSource}/timeseries/count`
          );
          const getTimeseriesRange = await fetchWithBQ(
            `${host}/containers/${container}/import/datasources/${dataSource}/timeseries/range`
          );

          const transformedData = await acc;

          transformedData.push({
            id: Number(val),
            name: key,
            lastIndex: isTimestamp(getTimeseriesRange.data.value.end),
            entries: isTimestamp(getTimeseriesCount.data.value.count),
          });

          return transformedData;
        }, Promise.resolve([]));

        return { data: result };
      },
    }),
  }),
});

export const { useGetTimeseriesDataQuery } = timeseriesDataApi;
