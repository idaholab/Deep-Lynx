"use client";

// Hooks
import { useContext, useEffect, useState } from "react";

// MUI
import { Grid, Tab, Tabs } from "@mui/material";

// Styles
import { classes } from "@/app/styles";

// Components
import Welcome from "./descriptive/components/welcome";
import Descriptive from "./descriptive/descriptive";
import Informative from "./informative/informative";
import WebGL from "./webgl";

// Providers
import PayloadProvider from "./context/payload";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// Types
import { RelatedNodeT, MeshObject } from "@/lib/types/modules/modelViewer";

export default function ModelViewer() {
  // Hooks
  const [start, setStart] = useState<boolean>(false);
  const [phase, setPhase] = useState<string>("descriptive");

  // Descriptive
  const [mesh, setMesh] = useState<MeshObject | undefined>(); // Mesh is the gameobject selected in the scene
  const [graph, setGraph] = useState<Array<RelatedNodeT> | undefined>(); // Graph is the array of nodes related to the selected mesh
  const [selected, setSelected] = useState<boolean>(false);
  const mappings: Array<string> = useAppSelector(
    (state) => state.modelViewer.mappings
  );

  // Handlers
  const handlePhase = (event: React.SyntheticEvent, phase: string) => {
    setPhase(phase);
  };

  // TODO: Refactor this
  useEffect(() => {
    setGraph(undefined); // If the metatype mappings have changed, remove the graph from state
  }, [mappings]);

  return (
    <>
      <PayloadProvider>
        <Grid container className={classes.grid}>
          <Grid item xs={4}>
            {start ? (
              <>
                <Tabs value={phase} onChange={handlePhase}>
                  <Tab label="Descriptive" value={"descriptive"} />
                  <Tab label="Informative" value={"informative"} />
                  <Tab disabled label="Predictive" value={"predictive"} />
                  <Tab disabled label="Living" value={"living"} />
                </Tabs>
                <br />
                {phase === "descriptive" ? (
                  <Descriptive
                    graph={graph}
                    mesh={mesh}
                    selected={selected}
                    start={start}
                  />
                ) : null}
                {phase === "informative" ? <Informative /> : null}
              </>
            ) : (
              <Welcome setStart={setStart} />
            )}
            <br />
          </Grid>
          <Grid item xs={8}>
            {start ? (
              <WebGL
                mappings={mappings}
                setGraph={setGraph}
                setMesh={setMesh}
                setSelected={setSelected}
              />
            ) : null}
          </Grid>
        </Grid>
      </PayloadProvider>
    </>
  );
}
