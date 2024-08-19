"use client";

// Hooks
import { createContext, useContext, useEffect } from "react";

// Store
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { containerActions } from "../store/features/container/containerSlice";

// Context
import { useContainer } from "@/lib/context/ContainerProvider";

// Types
import { DataSourceT } from "../types";

let DataSourcesContext = createContext<DataSourceT>({} as DataSourceT);

export default function DataSourceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const container = useContainer();

  // Store
  const storeDispatch = useAppDispatch();
  const selectedDataSource: DataSourceT = useAppSelector(
    (state) => state.container.dataSource!
  );
  const dataSources: Array<DataSourceT> = useAppSelector(
    (state) => state.container.dataSources!
  );

  // Hooks
  useEffect(() => {
    async function fetchDataSources() {
      let dataSources = await fetch(
        `/api/containers/${container.id}/import/datasources`,
        {
          method: "GET",
        }
      ).then((response) => {
        return response.json();
      });

      storeDispatch(containerActions.setDataSources(dataSources));
    }

    if (!dataSources) {
      fetchDataSources();
    }
  }, [container.id, storeDispatch, dataSources]);

  // Context
  DataSourcesContext = createContext(selectedDataSource);

  return (
    <DataSourcesContext.Provider value={selectedDataSource}>
      {children}
    </DataSourcesContext.Provider>
  );
}

// Custom hook to use the DataSourceContext
export const useDatasource = () => useContext(DataSourcesContext);
