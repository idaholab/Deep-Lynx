"use client";

// Hooks
import { useState, useEffect } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// Store
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { ontologyActions } from "@/lib/store/features/ontology/ontologySlice";
import { containerActions } from "@/lib/store/features/container/containerSlice";

// MUI
import { Typography } from "@mui/material";

const ContainerDashboard = () => {
  // Store
  const dataSources = useAppSelector((state) => state.container.dataSources);
  const metatypes = useAppSelector((state) => state.ontology.metatypes);
  const storeDispatch = useAppDispatch();

  // Context
  const container = useContainer();

  // Hooks
  // Datasources Hook
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
  }, [container]);

  // Metatypes Hook
  useEffect(() => {
    async function fetchMetatypes() {
      let metatypes = await fetch(
        `/api/containers/${container.id}/metatypes`
      ).then((response) => {
        return response.json();
      });

      storeDispatch(ontologyActions.setMetatypes(metatypes));
    }

    if (!metatypes) {
      fetchMetatypes();
    }
  }, [container]);

  return (
    <>
      <Typography variant="h2">Welcome to the container dashboard!</Typography>
    </>
  );
};

export default ContainerDashboard;
