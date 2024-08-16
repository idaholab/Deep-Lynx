"use client";

// Hooks
import { useState, useEffect } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// Store
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { ontologyActions } from "@/lib/store/features/ontology/ontologySlice";

// MUI
import { Typography } from "@mui/material";

const ContainerDashboard = () => {
  // Store
  const metatypes = useAppSelector((state) => state.ontology.metatypes);
  const storeDispatch = useAppDispatch();

  // Context
  const container = useContainer();

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
  }, [metatypes, container]);

  return (
    <>
      <Typography variant="h2">Welcome to the container dashboard!</Typography>
    </>
  );
};

export default ContainerDashboard;
