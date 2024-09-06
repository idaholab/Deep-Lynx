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
      console.log(data);
      props.setData(JSON.parse(data));
    },
    [props]
  );
  // const handleMeshData = useCallback(
  //   (data: any) => {
  //     props.setMesh(JSON.parse(data).data.graph);
  //   },
  //   [props]
  // );

  // Hooks
  useEffect(() => {
    console.log("Scene status: " + isLoaded);
  }, [isLoaded]);

  useEffect(() => {
    // addEventListener("SendMeshData", handleMeshData);
    addEventListener("SendJsonObjectsToReact", handleJsonObjects);
    return () => {
      // removeEventListener("SendMeshData", handleMeshData);
      removeEventListener("SendJsonObjectsToReact", handleJsonObjects);
    };
  }, [
    addEventListener,
    removeEventListener,
    // handleMeshData,
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
        style={{
          width: "100%",
          height: "50%",
        }}
      />
    </Container>
  );
};

export default WebGL;
