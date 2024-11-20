"use client";

// Hooks
import { useCallback, useContext, useEffect } from "react";
import { useUnityContext } from "react-unity-webgl";

// Unity
import { Unity } from "react-unity-webgl";

// MUI
import {
  Box,
  Container,
  Divider,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";

// Icons
import KeyboardIcon from "@mui/icons-material/Keyboard";
import MouseIcon from "@mui/icons-material/Mouse";

// Context
import { PayloadContext } from "./context/payload";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// Types
import {
  MeshObject,
  MeshBoolCallbackT,
  RelatedNodeT,
} from "@/lib/types/modules/modelViewer";

type PropsT = {
  mappings: Array<string>;
  setGraph: Function;
  setMesh: Function;
  setSelected: Function;
};

export default function WebGL(props: PropsT) {
  // Context
  const context = useContext(PayloadContext);
  const payload = context.payload;

  // Props
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
    isLoaded,
  } = useUnityContext({
    loaderUrl: "/webgl/webgl.loader.js",
    dataUrl: "/webgl/webgl.data",
    frameworkUrl: "/webgl/webgl.framework.js",
    codeUrl: "/webgl/webgl.wasm",
    streamingAssetsUrl: "/webgl/StreamingAssets",
  });

  useEffect(() => {
    isLoaded
      ? sendMessage("ReactMessenger", "SetModelConfig", JSON.stringify(payload))
      : null;
  }, [sendMessage, payload, isLoaded]);

  useEffect(() => {
    isLoaded
      ? sendMessage("DataManager", "UpdateMetatypes", JSON.stringify(mappings))
      : null;
  }, [sendMessage, mappings, isLoaded]);

  // Handlers
  const handleGraph = useCallback(
    (data: unknown) => {
      const nodes: Array<RelatedNodeT> = JSON.parse(data as string);
      if (nodes.length) setGraph(nodes);
    },
    [setGraph]
  );

  const handleMesh = useCallback(
    (data: unknown) => {
      setGraph(undefined);
      const mesh: MeshObject = JSON.parse(data as string);
      setMesh(mesh);
    },
    [setGraph, setMesh]
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
    addEventListener("SendCadNodeDataToReact", handleMesh);
    addEventListener("SendJsonObjectsToReact", handleGraph);
    addEventListener("SendSelectedBoolToReact", handleMeshBool);
    return () => {
      removeEventListener("SendCadNodeDataToReact", handleMesh);
      removeEventListener("SendJsonObjectsToReact", handleGraph);
      addEventListener("SendSelectedBoolToReact", handleMeshBool);
    };
  }, [
    addEventListener,
    removeEventListener,
    handleMesh,
    handleGraph,
    handleMeshBool,
  ]);

  return (
    <Container disableGutters>
      <Unity
        id={"webgl"}
        unityProvider={unityProvider}
        tabIndex={1} // Set tabIndex for Unity canvas to allow keyboard input; https://react-unity-webgl.dev/docs/api/tab-index
        style={{
          display: isLoaded ? "block" : "none",
          width: "100%",
          height: "65vh",
        }}
      />
      {isLoaded ? (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "start",
              alignItems: "center",
              width: "50%",
            }}
          >
            <Typography variant="button" sx={{ padding: ".45rem" }}>
              Game Controls
            </Typography>
          </Box>

          <Divider />
          <Box>
            <Tooltip
              title={
                "Use the WASD keys to move forward, left, backward, and right. Use the Q and E keys to move down, and up."
              }
              placement={"left"}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "start",
                  alignItems: "center",
                  width: "fit-content",
                }}
              >
                <KeyboardIcon fontSize="small" />
                <Typography variant="button" sx={{ padding: ".45rem" }}>
                  Keyboard Controls
                </Typography>
              </Box>
            </Tooltip>
          </Box>
          <Box>
            <Tooltip
              title={
                "Right click to select an object. Left click and drag to rotate the camera."
              }
              placement={"left"}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "start",
                  alignItems: "center",
                  width: "fit-content",
                }}
              >
                <MouseIcon fontSize="small" />
                <Typography variant="button" sx={{ padding: ".45rem" }}>
                  Mouse Controls
                </Typography>
              </Box>
            </Tooltip>
          </Box>
        </>
      ) : (
        <>
          <Skeleton variant="rectangular" width={"100%"} height={"65vh"} />
          <br />
          <Skeleton variant="text" width={"50%"} height={"5vh"} />
          <Skeleton variant="text" width={"50%"} height={"5vh"} />
          <Skeleton variant="text" width={"50%"} height={"5vh"} />
        </>
      )}
    </Container>
  );
}
