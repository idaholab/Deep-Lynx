"use client";

// Hooks
import { useCallback, useEffect } from "react";
import { useUnityContext } from "react-unity-webgl";

// Unity
import { Unity } from "react-unity-webgl";

// MUI
import { Container } from "@mui/material";

type Props = {
  setMesh: Function;
  setData: Function;
  payload: {
    ConfigType: string;
    FileName: string;
    GraphType: string;
    GraphRootDlId: string;
    AssetMetatypeName: string;
    DefaultInteractions: Array<string>;
    MetatypeMappings: {
      CADMetadata: string;
      Quality: string;
    };
    BaseUrl: string;
    Token: string;
    ContainerId: string;
    FileId: string;
  };
};

function WebGL(props: Props) {
  const { unityProvider, addEventListener, removeEventListener, sendMessage } =
    useUnityContext({
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
      console.log("Mesh Data:");
      console.log(JSON.parse(data));
      props.setMesh(JSON.parse(data).data.graph);
    },
    [props]
  );

  // Hooks
  useEffect(() => {
    addEventListener("SendMeshData", handleMeshData);
    addEventListener("SendJsonObjectsToReact", handleJsonObjects);
    return () => {
      removeEventListener("SendMeshData", handleMeshData);
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
        style={{
          width: "100%",
          height: "50%",
        }}
      />
    </Container>
  );
}

export default WebGL;
