"use client";

// Hooks
import { useEffect, useState } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";

// MUI
import { Grid } from "@mui/material";

// Styles
import { classes } from "@/app/styles";

// Components
import Welcome from "./components/welcome";
import Graph from "./graph";
import WebGL from "./webgl";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// Types
import { ContainerT, FileT } from "@/lib/types/deeplynx";
import {
  PayloadT,
  RelatedNodeT,
  MeshObject,
} from "@/lib/types/modules/modelViewer";

export default function Home() {
  // Hooks
  const [start, setStart] = useState<boolean>(false);
  const [payload, setPayload] = useState<PayloadT>({} as PayloadT);

  const [mesh, setMesh] = useState<MeshObject | undefined>(); // Mesh is the gameobject selected in the scene
  const [graph, setGraph] = useState<Array<RelatedNodeT> | undefined>(); // Graph is the array of nodes related to the selected mesh
  const [selected, setSelected] = useState<boolean>(false);
  const mappings: Array<string> = useAppSelector(
    (state) => state.modelViewer.mappings
  );

  // Store
  const container: ContainerT = useContainer();
  const file: FileT = useAppSelector((state) => state.modelViewer.file!);

  useEffect(() => {
    setPayload({
      ConfigType: "Remote",
      FileName: file.file_name,
      GraphType: "cad",
      GraphRootDlId: "2", // Must come from Pixyz; now using Pixyz' NodeId instead of DeepLynxID; the root Pixyz' NodeId should always be "2" (at least according to all the CAD models I've tested); however, we can make this more robust, and the best way might be for React to receive info back from Airflow https://github.inl.gov/Digital-Engineering/Pythagoras/issues/17
      AssetMetatypeName: "MeshGameObject",
      DefaultInteractions: ["CadNodeDataToReact", "SelectAndFadeOthers"],
      BaseUrl: "https://deeplynx.dev.inl.gov",
      Token: process.env.NEXT_PUBLIC_TOKEN!,
      ContainerId: container.id,
      FileId: file.id,
    });
  }, [container, file]);

  useEffect(() => {
    setGraph(undefined); // If the metatype mappings have changed, remove the graph from state
  }, [mappings]);

  return (
    <>
      <Grid container className={classes.grid}>
        <Grid item xs={4}>
          <Graph graph={graph} mesh={mesh} selected={selected} start={start} />
          {start ? null : <Welcome setStart={setStart} />}
          <br />
        </Grid>
        <Grid item xs={8}>
          {start ? (
            <WebGL
              payload={payload}
              mappings={mappings}
              setGraph={setGraph}
              setMesh={setMesh}
              setSelected={setSelected}
            />
          ) : null}
        </Grid>
      </Grid>
    </>
  );
}
