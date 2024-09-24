"use client";

// Hooks
import { useCallback, useEffect, useRef } from "react";
import { useUnityContext } from "react-unity-webgl";

// Unity
import { Unity } from "react-unity-webgl";

// MUI
import { Container } from "@mui/material";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// Types
import {
  PayloadT,
  MeshObject,
  MeshBoolCallbackT,
  RelatedNodeT,
} from "@/lib/types/modules/modelViewer";

type PropsT = {
  payload: PayloadT;
  mappings: Array<string>;
  setGraph: Function;
  setMesh: Function;
  setSelected: Function;
};

export default function WebGL(props: PropsT) {
  // Props
  const payload = props.payload;
  const setGraph = props.setGraph;
  const setMesh = props.setMesh;
  const setSelected = props.setSelected;

  // Store
  const mappings: Array<string> = useAppSelector(
    (state) => state.modelViewer.mappings
  );

  // Hooks
  const {
    unityProvider,
    addEventListener,
    removeEventListener,
    sendMessage,
    unload,
  } = useUnityContext({
    loaderUrl: "/webgl/webgl.loader.js",
    dataUrl: "/webgl/webgl.data",
    frameworkUrl: "/webgl/webgl.framework.js",
    codeUrl: "/webgl/webgl.wasm",
    streamingAssetsUrl: "/webgl/StreamingAssets",
  });

  useEffect(() => {
    sendMessage("ReactMessenger", "SetModelConfig", JSON.stringify(payload));
  }, [sendMessage, payload]);

  useEffect(() => {
    sendMessage("DataManager", "UpdateMetatypes", JSON.stringify(mappings));
  }, [sendMessage, mappings]);

  // Handlers
  const handleJsonObjects = useCallback(
    (data: unknown) => {
      const nodes: Array<RelatedNodeT> = JSON.parse(data as string);
      setGraph(nodes);
    },
    [setGraph]
  );

  const handleMeshData = useCallback(
    (data: unknown) => {
      const mesh: MeshObject = JSON.parse(data as string);
      setMesh(mesh);
    },
    [setMesh]
  );

  const handleMeshBool = useCallback(
    (data: unknown) => {
      const highlight: MeshBoolCallbackT = JSON.parse(data as string);
      setSelected(highlight.selected);
    },
    [setSelected]
  );

  // Hooks
  useEffect(() => {
    addEventListener("SendCadNodeDataToReact", handleMeshData);
    addEventListener("SendJsonObjectsToReact", handleJsonObjects);
    addEventListener("SendSelectedBoolToReact", handleMeshBool);
    return () => {
      removeEventListener("SendCadNodeDataToReact", handleMeshData);
      removeEventListener("SendJsonObjectsToReact", handleJsonObjects);
      addEventListener("SendSelectedBoolToReact", handleMeshBool);
    };
  }, [
    addEventListener,
    removeEventListener,
    handleMeshData,
    handleJsonObjects,
    handleMeshBool,
  ]);

  return (
    <Container disableGutters>
      <Unity
        id={"webgl"}
        unityProvider={unityProvider}
        tabIndex={1} // Set tabIndex for Unity canvas to allow keyboard input; https://react-unity-webgl.dev/docs/api/tab-index
        style={{
          width: "100%",
          height: "50%",
        }}
      />
    </Container>
  );
}
