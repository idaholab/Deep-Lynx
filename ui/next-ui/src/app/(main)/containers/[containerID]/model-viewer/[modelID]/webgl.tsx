"use client";

// Hooks
import { useEffect } from "react";
import { useContainer } from "@/lib/context/ContainerProvider";
import { useUnityContext } from "react-unity-webgl";

// Unity
import { Unity } from "react-unity-webgl";

// Store
import { useAppSelector } from "@/lib/store/hooks";

// Types
import { ContainerT, FileT } from "@/lib/types";

function WebGL() {
  // Hooks
  const container: ContainerT = useContainer();
  const file: FileT = useAppSelector((state) => state.modelViewer.file!);

  const payload = {
    ConfigType: "Remote",
    FileName: "another_drawing_name.glb",
    GraphType: "cad",
    GraphRootDlId: "5119985",
    AssetMetatypeName: "MeshGameObject",
    DefaultInteractions: ["Highlight", "Draggable"],
    MetatypeMappings: {
      CADMetadata: "Metadata",
      Requirement: "JsonObjectsToReact",
    },
    BaseUrl: "https://deeplynx.azuredev.inl.gov",
    Token:
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNhbWxfYWRmcyIsImRpc3BsYXlfbmFtZSI6IkphY2sgTS4gQ2F2YWx1enppIiwiZW1haWwiOiJKYWNrLkNhdmFsdXp6aUBpbmwuZ292IiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJ1c2VyX2lkIjoiNSIsImtleSI6Ill6VmpObVl5TTJVdE1URmxZUzAwTVdKbUxXSXhaREl0TkRrMk1XVmpaVGd6TW1VdyIsInNlY3JldCI6IiQyYSQxMCRjdW85MGtOMHJPTndldmFwSmM2alYuTVdiSGhYYi9xNWl6ekZYY2lQbzNOdzA0Zmh5TzNLaSIsIm5vdGUiOiJBSEEiLCJpZCI6IjUiLCJpZGVudGl0eV9wcm92aWRlcl9pZCI6IkphY2suQ2F2YWx1enppQGlubC5nb3YiLCJjcmVhdGVkX2F0IjoiMjAyMi0wMy0xNFQwNjowMDowMC4wMDBaIiwibW9kaWZpZWRfYXQiOiIyMDIyLTAzLTE0VDA2OjAwOjAwLjAwMFoiLCJjcmVhdGVkX2J5Ijoic2FtbC1hZGZzIGxvZ2luIiwibW9kaWZpZWRfYnkiOiJzYW1sLWFkZnMgbG9naW4iLCJyZXNldF90b2tlbl9pc3N1ZWQiOm51bGwsImlhdCI6MTcwMTg3OTcwOSwiZXhwIjoxNzcwOTk5NzA5fQ.k98-_uK77bzVL3jp2vzWWbANAqJDPDV7jXDRqlmhY0-rsZPhjBSbFR09robMPIlHuqbfcELtt4cHrLKSitvrymVPrvH78R7Gd3FhJ6lIP_Yqk7N2VNOy7Q42wlbOCR6-nICFS90AdZ7AHRP5AW8mqlmcWgPJvdFXo2Qz6Y1cRvLb0_6Ei6zmRLM1zyKu_ZyPhhBD42aZWkbZDcutKQOIR7K7KfmaTB4eTzKz3JjxAJ3gMXPmZHC3R3KAUMwMggNAgSK7mg6IAPOyE4E158KJr1lOVoBACgoOIbcXdc0sZiFdPvGPjO9FYhZc4XtjPWYmlHLo2NcnT_OXeu4E5Q7_Ag",
    ContainerId: container.id,
    FileId: file.id,
  };

  const { unityProvider, sendMessage, isLoaded } = useUnityContext({
    loaderUrl: "/webgl/webgl.loader.js",
    dataUrl: "/webgl/webgl.data",
    frameworkUrl: "/webgl/webgl.framework.js",
    codeUrl: "/webgl/webgl.wasm",
    streamingAssetsUrl: "/webgl/StreamingAssets",
  });

  useEffect(() => {
    // if (isLoaded) sendMessage("ReactMessenger", "SetModelConfig", glb);
  }, [isLoaded]);

  return (
    <>
      <Unity
        unityProvider={unityProvider}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </>
  );
}

export default WebGL;
