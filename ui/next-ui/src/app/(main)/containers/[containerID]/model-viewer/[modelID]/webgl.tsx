"use client";

// Hooks
import { useCallback, useEffect } from "react";
import { useUnityContext } from "react-unity-webgl";

// Unity
import { Unity } from "react-unity-webgl";

// MUI
import { Container } from "@mui/material";

// Types
import { PayloadT } from "./page";
type PropsT = {
  payload: PayloadT;
  setData: Function;
  setMesh: Function;
};

const WebGL = (props: PropsT) => {
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

  // Handlers
  const handleJsonObjects = useCallback(
    (data: any) => {
      props.setData(JSON.parse(data));
    },
    [props]
  );

  const handleMeshData = useCallback(
    (data: any) => {
      console.log(data);
      props.setMesh(JSON.parse(data));
    },
    [props]
  );

  useEffect(() => {
    addEventListener("SendCadNodeDataToReact", handleMeshData);
    addEventListener("SendJsonObjectsToReact", handleJsonObjects);
    return () => {
      removeEventListener("SendCadNodeDataToReact", handleMeshData);
      removeEventListener("SendJsonObjectsToReact", handleJsonObjects);
    };
  }, [
    addEventListener,
    removeEventListener,
    handleMeshData,
    handleJsonObjects,
  ]);

  useEffect(() => {
    sendMessage(
      "ReactMessenger",
      "SetModelConfig",
      JSON.stringify(props.payload)
    );
  }, [sendMessage, props.payload]);

  return (
    <Container disableGutters>
      <Unity
        unityProvider={unityProvider}
        tabIndex={1} // Set tabIndex for Unity canvas to allow keyboard input; https://react-unity-webgl.dev/docs/api/tab-index
        style={{
          width: "100%",
          height: "50%",
        }}
      />
    </Container>
  );
};

export default WebGL;
